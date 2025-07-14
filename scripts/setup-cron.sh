#!/bin/bash

# DNSweeper 自動実行スケジュール設定
# バックアップ・監視・メンテナンスタスクのcron設定

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DNSWEEPER_ROOT="$(dirname "$SCRIPT_DIR")"

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# crontabエントリ作成
create_crontab_entries() {
    cat << EOF
# DNSweeper 自動実行スケジュール
# Generated on $(date)

# 毎日午前2時にフルバックアップ実行
0 2 * * * cd $DNSWEEPER_ROOT && $SCRIPT_DIR/backup-system.sh >> /var/log/dnsweeper/backup.log 2>&1

# 毎時間パフォーマンス監視レポート生成
0 * * * * cd $DNSWEEPER_ROOT && node -e "
const { globalPerformanceMonitor } = require('./dist/lib/performance-monitor.js');
const report = globalPerformanceMonitor.generateReport(3600000);
console.log(JSON.stringify(report, null, 2));
" >> /var/log/dnsweeper/performance.log 2>&1

# 毎週日曜日午前3時にシステムメンテナンス
0 3 * * 0 cd $DNSWEEPER_ROOT && $SCRIPT_DIR/maintenance.sh >> /var/log/dnsweeper/maintenance.log 2>&1

# 毎日午前4時に古いログファイルクリーンアップ
0 4 * * * find /var/log/dnsweeper -name "*.log" -mtime +30 -delete

# 毎15分でヘルスチェック
*/15 * * * * curl -f http://localhost:3001/health > /dev/null 2>&1 || echo "$(date): Health check failed" >> /var/log/dnsweeper/health.log

# 毎時間でディスク使用量チェック
0 * * * * df -h | awk '\$5 ~ /^[8-9][0-9]%$/ || \$5 ~ /^100%$/ {print "$(date): High disk usage on " \$6 ": " \$5}' >> /var/log/dnsweeper/disk.log

# 毎日午前1時にDocker images クリーンアップ
0 1 * * * docker system prune -f --volumes >> /var/log/dnsweeper/docker-cleanup.log 2>&1

EOF
}

# ログディレクトリ作成
setup_log_directories() {
    log_info "Setting up log directories..."
    
    sudo mkdir -p /var/log/dnsweeper
    sudo chown $USER:$USER /var/log/dnsweeper
    sudo chmod 755 /var/log/dnsweeper
    
    # ログローテーション設定
    sudo tee /etc/logrotate.d/dnsweeper > /dev/null << EOF
/var/log/dnsweeper/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
    create 644 $USER $USER
}
EOF
    
    log_success "Log directories and rotation configured"
}

# メンテナンススクリプト作成
create_maintenance_script() {
    log_info "Creating maintenance script..."
    
    cat > "$SCRIPT_DIR/maintenance.sh" << 'EOF'
#!/bin/bash

# DNSweeper 週次メンテナンススクリプト

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DNSWEEPER_ROOT="$(dirname "$SCRIPT_DIR")"

log_info() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] $1"
}

log_success() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [SUCCESS] $1"
}

main() {
    log_info "Starting weekly maintenance..."
    
    cd "$DNSWEEPER_ROOT"
    
    # Docker containers 再起動（ローリング）
    log_info "Performing rolling restart of services..."
    docker-compose restart backend
    sleep 10
    docker-compose restart frontend
    sleep 5
    docker-compose restart nginx
    
    # データベース VACUUM とインデックス再構築
    log_info "Optimizing database..."
    docker-compose exec -T postgres psql -U dnsweeper -d dnsweeper -c "VACUUM ANALYZE;"
    docker-compose exec -T postgres psql -U dnsweeper -d dnsweeper -c "REINDEX DATABASE dnsweeper;"
    
    # Redis メモリ最適化
    log_info "Optimizing Redis memory..."
    docker-compose exec -T redis redis-cli MEMORY PURGE
    
    # ファイルシステムチェック
    log_info "Checking file system integrity..."
    
    # アップロードディレクトリの整合性チェック
    if [[ -d "web/backend/uploads" ]]; then
        find web/backend/uploads -type f -name "*.tmp" -mtime +1 -delete 2>/dev/null || true
        find web/backend/uploads -type f -size 0 -delete 2>/dev/null || true
    fi
    
    # 一時ファイルクリーンアップ
    find /tmp -name "dnsweeper-*" -mtime +7 -delete 2>/dev/null || true
    
    # SSL証明書有効期限チェック
    if [[ -f "nginx/ssl/cert.pem" ]]; then
        expiry_date=$(openssl x509 -enddate -noout -in nginx/ssl/cert.pem | cut -d= -f2)
        expiry_epoch=$(date -d "$expiry_date" +%s)
        current_epoch=$(date +%s)
        days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))
        
        if [[ $days_until_expiry -lt 30 ]]; then
            log_info "SSL certificate expires in $days_until_expiry days - consider renewal"
        fi
    fi
    
    # パフォーマンス統計集計
    log_info "Generating weekly performance summary..."
    node -e "
    const { globalPerformanceMonitor } = require('./dist/lib/performance-monitor.js');
    const report = globalPerformanceMonitor.generateReport(604800000); // 1週間
    console.log('Weekly Performance Summary:');
    console.log(JSON.stringify(report.summary, null, 2));
    " 2>/dev/null || log_info "Performance monitoring not available"
    
    log_success "Weekly maintenance completed"
}

main "$@"
EOF
    
    chmod +x "$SCRIPT_DIR/maintenance.sh"
    log_success "Maintenance script created"
}

# ヘルスチェックスクリプト作成
create_health_check_script() {
    log_info "Creating health check script..."
    
    cat > "$SCRIPT_DIR/health-check.sh" << 'EOF'
#!/bin/bash

# DNSweeper ヘルスチェックスクリプト

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DNSWEEPER_ROOT="$(dirname "$SCRIPT_DIR")"

check_service() {
    local service_name="$1"
    local url="$2"
    local timeout="${3:-10}"
    
    if curl -f -s --max-time "$timeout" "$url" > /dev/null; then
        echo "✓ $service_name: OK"
        return 0
    else
        echo "✗ $service_name: FAILED"
        return 1
    fi
}

check_docker_service() {
    local container_name="$1"
    
    if docker ps --format "table {{.Names}}" | grep -q "^$container_name$"; then
        echo "✓ Container $container_name: Running"
        return 0
    else
        echo "✗ Container $container_name: Not running"
        return 1
    fi
}

main() {
    echo "=== DNSweeper Health Check $(date) ==="
    
    local failed=0
    
    # Docker containers チェック
    check_docker_service "dnsweeper-frontend" || ((failed++))
    check_docker_service "dnsweeper-backend" || ((failed++))
    check_docker_service "dnsweeper-postgres" || ((failed++))
    check_docker_service "dnsweeper-redis" || ((failed++))
    check_docker_service "dnsweeper-nginx" || ((failed++))
    
    # サービスエンドポイントチェック
    check_service "Frontend" "http://localhost:3000/health" || ((failed++))
    check_service "Backend API" "http://localhost:3001/health" || ((failed++))
    check_service "Nginx" "http://localhost:80/health" || ((failed++))
    
    # データベース接続チェック
    if docker exec dnsweeper-postgres pg_isready -U dnsweeper > /dev/null 2>&1; then
        echo "✓ PostgreSQL: OK"
    else
        echo "✗ PostgreSQL: Connection failed"
        ((failed++))
    fi
    
    # Redis接続チェック
    if docker exec dnsweeper-redis redis-cli ping > /dev/null 2>&1; then
        echo "✓ Redis: OK"
    else
        echo "✗ Redis: Connection failed"
        ((failed++))
    fi
    
    # ディスク容量チェック
    disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [[ $disk_usage -lt 90 ]]; then
        echo "✓ Disk usage: ${disk_usage}% (OK)"
    else
        echo "✗ Disk usage: ${disk_usage}% (HIGH)"
        ((failed++))
    fi
    
    # メモリ使用量チェック
    memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    if [[ $memory_usage -lt 90 ]]; then
        echo "✓ Memory usage: ${memory_usage}% (OK)"
    else
        echo "✗ Memory usage: ${memory_usage}% (HIGH)"
        ((failed++))
    fi
    
    echo "========================"
    
    if [[ $failed -eq 0 ]]; then
        echo "🎉 All health checks passed!"
        exit 0
    else
        echo "❌ $failed health check(s) failed"
        exit 1
    fi
}

main "$@"
EOF
    
    chmod +x "$SCRIPT_DIR/health-check.sh"
    log_success "Health check script created"
}

# cron設定インストール
install_crontab() {
    log_info "Installing crontab entries..."
    
    # 既存のcrontabを取得
    existing_crontab=$(crontab -l 2>/dev/null || echo "")
    
    # DNSweeperエントリを削除（既存の場合）
    filtered_crontab=$(echo "$existing_crontab" | grep -v "DNSweeper" || true)
    
    # 新しいエントリを追加
    {
        echo "$filtered_crontab"
        echo ""
        create_crontab_entries
    } | crontab -
    
    log_success "Crontab entries installed"
}

# メイン実行
main() {
    log_info "Setting up DNSweeper automated tasks..."
    
    setup_log_directories
    create_maintenance_script
    create_health_check_script
    install_crontab
    
    log_success "DNSweeper automation setup completed!"
    
    echo ""
    echo "Scheduled tasks:"
    echo "  • Daily backup at 2:00 AM"
    echo "  • Hourly performance monitoring"
    echo "  • Weekly maintenance on Sunday 3:00 AM"
    echo "  • Health checks every 15 minutes"
    echo "  • Log cleanup daily at 4:00 AM"
    echo ""
    echo "Manual commands:"
    echo "  • Health check: $SCRIPT_DIR/health-check.sh"
    echo "  • Manual backup: $SCRIPT_DIR/backup-system.sh"
    echo "  • Manual maintenance: $SCRIPT_DIR/maintenance.sh"
    echo ""
    echo "Logs location: /var/log/dnsweeper/"
}

# 使用方法表示
show_usage() {
    cat << EOF
DNSweeper Automation Setup

Usage: $0 [OPTIONS]

Options:
    -h, --help      Show this help message
    --remove        Remove all DNSweeper cron entries
    --status        Show current cron status

EOF
}

# コマンドライン引数処理
case "${1:-}" in
    -h|--help)
        show_usage
        exit 0
        ;;
    --remove)
        log_info "Removing DNSweeper cron entries..."
        existing_crontab=$(crontab -l 2>/dev/null || echo "")
        filtered_crontab=$(echo "$existing_crontab" | grep -v "DNSweeper" || true)
        echo "$filtered_crontab" | crontab -
        log_success "DNSweeper cron entries removed"
        exit 0
        ;;
    --status)
        echo "Current DNSweeper cron entries:"
        crontab -l | grep -A 20 "DNSweeper" || echo "No DNSweeper entries found"
        exit 0
        ;;
    "")
        main
        ;;
    *)
        echo "Unknown option: $1"
        show_usage
        exit 1
        ;;
esac