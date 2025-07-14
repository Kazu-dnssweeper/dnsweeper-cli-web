#!/bin/bash

# DNSweeper 自動バックアップシステム
# プロダクション環境でのデータベース・ファイル・設定の自動バックアップ

set -e

# 設定
BACKUP_DIR="${BACKUP_DIR:-/var/backups/dnsweeper}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-dnsweeper-postgres}"
REDIS_CONTAINER="${REDIS_CONTAINER:-dnsweeper-redis}"
NOTIFICATION_EMAIL="${NOTIFICATION_EMAIL:-admin@example.com}"
S3_BUCKET="${S3_BUCKET:-}"
COMPRESSION_LEVEL="${COMPRESSION_LEVEL:-6}"

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ログ関数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

# エラートラップ
error_exit() {
    log_error "Backup failed at line $1"
    send_notification "FAILED" "Backup process failed at line $1"
    exit 1
}

trap 'error_exit $LINENO' ERR

# 通知送信
send_notification() {
    local status="$1"
    local message="$2"
    
    if [[ -n "$NOTIFICATION_EMAIL" ]]; then
        {
            echo "To: $NOTIFICATION_EMAIL"
            echo "Subject: DNSweeper Backup $status"
            echo "Content-Type: text/plain; charset=UTF-8"
            echo ""
            echo "DNSweeper Backup Status: $status"
            echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
            echo "Server: $(hostname)"
            echo ""
            echo "Message: $message"
            echo ""
            echo "Backup Directory: $BACKUP_DIR"
            echo "Retention Policy: $RETENTION_DAYS days"
        } | sendmail "$NOTIFICATION_EMAIL" 2>/dev/null || log_warning "Failed to send email notification"
    fi
    
    # Webhook通知（設定されている場合）
    if [[ -n "$WEBHOOK_URL" ]]; then
        curl -s -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"status\":\"$status\",\"message\":\"$message\",\"timestamp\":\"$(date -Iseconds)\"}" \
            || log_warning "Failed to send webhook notification"
    fi
}

# バックアップディレクトリ作成
create_backup_directories() {
    local timestamp="$1"
    local backup_path="$BACKUP_DIR/$timestamp"
    
    mkdir -p "$backup_path"/{database,redis,files,config,logs}
    echo "$backup_path"
}

# PostgreSQLバックアップ
backup_postgresql() {
    local backup_path="$1"
    
    log_info "Starting PostgreSQL backup..."
    
    if ! docker ps --format "table {{.Names}}" | grep -q "^$POSTGRES_CONTAINER$"; then
        log_error "PostgreSQL container $POSTGRES_CONTAINER is not running"
        return 1
    fi
    
    # スキーマ付きフルバックアップ
    docker exec "$POSTGRES_CONTAINER" pg_dumpall -U dnsweeper | \
        gzip -"$COMPRESSION_LEVEL" > "$backup_path/database/full_backup.sql.gz"
    
    # 各データベース個別バックアップ
    for db in $(docker exec "$POSTGRES_CONTAINER" psql -U dnsweeper -t -c "SELECT datname FROM pg_database WHERE datistemplate = false AND datname != 'postgres';" | xargs); do
        if [[ -n "$db" ]]; then
            docker exec "$POSTGRES_CONTAINER" pg_dump -U dnsweeper "$db" | \
                gzip -"$COMPRESSION_LEVEL" > "$backup_path/database/${db}_backup.sql.gz"
        fi
    done
    
    # 設定ファイルバックアップ
    docker exec "$POSTGRES_CONTAINER" cat /var/lib/postgresql/data/postgresql.conf > \
        "$backup_path/database/postgresql.conf" 2>/dev/null || true
    
    log_success "PostgreSQL backup completed"
}

# Redisバックアップ
backup_redis() {
    local backup_path="$1"
    
    log_info "Starting Redis backup..."
    
    if ! docker ps --format "table {{.Names}}" | grep -q "^$REDIS_CONTAINER$"; then
        log_error "Redis container $REDIS_CONTAINER is not running"
        return 1
    fi
    
    # Redis RDBファイルバックアップ
    docker exec "$REDIS_CONTAINER" redis-cli BGSAVE
    
    # バックグラウンド保存完了まで待機
    while [[ "$(docker exec "$REDIS_CONTAINER" redis-cli LASTSAVE)" == "$(docker exec "$REDIS_CONTAINER" redis-cli LASTSAVE)" ]]; do
        sleep 1
    done
    
    # RDBファイルをコピー
    docker exec "$REDIS_CONTAINER" cat /data/dump.rdb | \
        gzip -"$COMPRESSION_LEVEL" > "$backup_path/redis/dump.rdb.gz"
    
    # Redis設定もバックアップ
    docker exec "$REDIS_CONTAINER" cat /usr/local/etc/redis/redis.conf > \
        "$backup_path/redis/redis.conf" 2>/dev/null || true
    
    log_success "Redis backup completed"
}

# アプリケーションファイルバックアップ
backup_application_files() {
    local backup_path="$1"
    
    log_info "Starting application files backup..."
    
    # アップロードファイル
    if [[ -d "web/backend/uploads" ]]; then
        tar -czf "$backup_path/files/uploads.tar.gz" -C web/backend uploads/ 2>/dev/null || true
    fi
    
    # ログファイル
    if [[ -d "logs" ]]; then
        tar -czf "$backup_path/logs/application_logs.tar.gz" -C . logs/ 2>/dev/null || true
    fi
    
    # Nginx ログ
    if [[ -d "nginx/logs" ]]; then
        tar -czf "$backup_path/logs/nginx_logs.tar.gz" -C nginx logs/ 2>/dev/null || true
    fi
    
    log_success "Application files backup completed"
}

# 設定ファイルバックアップ
backup_configuration() {
    local backup_path="$1"
    
    log_info "Starting configuration backup..."
    
    # 環境設定
    [[ -f ".env" ]] && cp .env "$backup_path/config/env_backup"
    [[ -f ".env.production" ]] && cp .env.production "$backup_path/config/env_production_backup"
    
    # Docker設定
    [[ -f "docker-compose.yml" ]] && cp docker-compose.yml "$backup_path/config/"
    [[ -f "docker-compose.override.yml" ]] && cp docker-compose.override.yml "$backup_path/config/" 2>/dev/null || true
    
    # Nginx設定
    if [[ -d "nginx" ]]; then
        tar -czf "$backup_path/config/nginx_config.tar.gz" -C . nginx/ 2>/dev/null || true
    fi
    
    # SSL証明書
    if [[ -d "nginx/ssl" ]]; then
        tar -czf "$backup_path/config/ssl_certificates.tar.gz" -C nginx ssl/ 2>/dev/null || true
    fi
    
    # アプリケーション設定
    [[ -f "src/config/default.json" ]] && cp src/config/default.json "$backup_path/config/" 2>/dev/null || true
    [[ -f "src/config/production.json" ]] && cp src/config/production.json "$backup_path/config/" 2>/dev/null || true
    
    log_success "Configuration backup completed"
}

# バックアップ検証
verify_backup() {
    local backup_path="$1"
    local errors=0
    
    log_info "Verifying backup integrity..."
    
    # データベースバックアップ検証
    if [[ -f "$backup_path/database/full_backup.sql.gz" ]]; then
        if ! gzip -t "$backup_path/database/full_backup.sql.gz"; then
            log_error "Database backup is corrupted"
            ((errors++))
        fi
    else
        log_error "Database backup file not found"
        ((errors++))
    fi
    
    # Redisバックアップ検証
    if [[ -f "$backup_path/redis/dump.rdb.gz" ]]; then
        if ! gzip -t "$backup_path/redis/dump.rdb.gz"; then
            log_error "Redis backup is corrupted"
            ((errors++))
        fi
    else
        log_error "Redis backup file not found"
        ((errors++))
    fi
    
    # ファイルサイズチェック
    local total_size=$(du -sb "$backup_path" | cut -f1)
    if [[ $total_size -lt 1024 ]]; then
        log_error "Backup size too small: $total_size bytes"
        ((errors++))
    fi
    
    if [[ $errors -eq 0 ]]; then
        log_success "Backup verification passed"
        return 0
    else
        log_error "Backup verification failed with $errors errors"
        return 1
    fi
}

# S3アップロード（オプション）
upload_to_s3() {
    local backup_path="$1"
    local timestamp="$2"
    
    if [[ -z "$S3_BUCKET" ]]; then
        log_info "S3 upload skipped (no bucket configured)"
        return 0
    fi
    
    log_info "Uploading backup to S3 bucket: $S3_BUCKET"
    
    # バックアップ全体をtar.gzに圧縮
    local archive_name="dnsweeper_backup_$timestamp.tar.gz"
    tar -czf "/tmp/$archive_name" -C "$BACKUP_DIR" "$timestamp"
    
    # S3にアップロード
    if command -v aws >/dev/null 2>&1; then
        aws s3 cp "/tmp/$archive_name" "s3://$S3_BUCKET/backups/$archive_name"
        rm "/tmp/$archive_name"
        log_success "Backup uploaded to S3"
    else
        log_error "AWS CLI not found, skipping S3 upload"
        return 1
    fi
}

# 古いバックアップクリーンアップ
cleanup_old_backups() {
    log_info "Cleaning up backups older than $RETENTION_DAYS days..."
    
    # ローカルバックアップクリーンアップ
    find "$BACKUP_DIR" -type d -name "????-??-??_??-??-??" -mtime +$RETENTION_DAYS -exec rm -rf {} \; 2>/dev/null || true
    
    # S3バックアップクリーンアップ（設定されている場合）
    if [[ -n "$S3_BUCKET" ]] && command -v aws >/dev/null 2>&1; then
        aws s3 ls "s3://$S3_BUCKET/backups/" | \
            awk '$1 < "'$(date -d "$RETENTION_DAYS days ago" +%Y-%m-%d)'" {print $4}' | \
            while read -r file; do
                [[ -n "$file" ]] && aws s3 rm "s3://$S3_BUCKET/backups/$file"
            done
    fi
    
    log_success "Old backups cleaned up"
}

# バックアップ統計生成
generate_backup_stats() {
    local backup_path="$1"
    
    log_info "Generating backup statistics..."
    
    {
        echo "=== DNSweeper Backup Statistics ==="
        echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
        echo "Backup Path: $backup_path"
        echo ""
        echo "=== File Sizes ==="
        du -h "$backup_path"/* 2>/dev/null | sort -hr || true
        echo ""
        echo "=== Total Backup Size ==="
        du -sh "$backup_path"
        echo ""
        echo "=== Database Statistics ==="
        if [[ -f "$backup_path/database/full_backup.sql.gz" ]]; then
            echo "Database backup size: $(stat --format=%s "$backup_path/database/full_backup.sql.gz" | numfmt --to=iec-i --suffix=B)"
            echo "Compressed ratio: $(echo "scale=2; $(stat --format=%s "$backup_path/database/full_backup.sql.gz") / $(gzip -l "$backup_path/database/full_backup.sql.gz" | tail -1 | awk '{print $2}') * 100" | bc -l)%"
        fi
        echo ""
        echo "=== Redis Statistics ==="
        if [[ -f "$backup_path/redis/dump.rdb.gz" ]]; then
            echo "Redis backup size: $(stat --format=%s "$backup_path/redis/dump.rdb.gz" | numfmt --to=iec-i --suffix=B)"
        fi
        echo ""
        echo "=== Disk Usage ==="
        df -h "$BACKUP_DIR"
    } > "$backup_path/backup_stats.txt"
    
    log_success "Backup statistics generated"
}

# メイン実行
main() {
    local timestamp=$(date '+%Y-%m-%d_%H-%M-%S')
    local start_time=$(date +%s)
    
    log_info "Starting DNSweeper backup process..."
    log_info "Backup timestamp: $timestamp"
    
    # バックアップディレクトリ作成
    local backup_path=$(create_backup_directories "$timestamp")
    
    # 各種バックアップ実行
    backup_postgresql "$backup_path"
    backup_redis "$backup_path"
    backup_application_files "$backup_path"
    backup_configuration "$backup_path"
    
    # バックアップ検証
    if verify_backup "$backup_path"; then
        # 統計生成
        generate_backup_stats "$backup_path"
        
        # S3アップロード（オプション）
        upload_to_s3 "$backup_path" "$timestamp"
        
        # 古いバックアップクリーンアップ
        cleanup_old_backups
        
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        log_success "Backup completed successfully in ${duration}s"
        send_notification "SUCCESS" "Backup completed successfully in ${duration}s. Backup path: $backup_path"
    else
        log_error "Backup verification failed"
        send_notification "FAILED" "Backup verification failed. Backup path: $backup_path"
        exit 1
    fi
}

# 使用方法表示
show_usage() {
    cat << EOF
DNSweeper Backup System

Usage: $0 [OPTIONS]

Options:
    -h, --help              Show this help message
    -d, --backup-dir DIR    Backup directory (default: /var/backups/dnsweeper)
    -r, --retention DAYS    Retention period in days (default: 30)
    -e, --email EMAIL       Notification email address
    -s, --s3-bucket BUCKET  S3 bucket for remote backup
    -c, --compression LEVEL Compression level 1-9 (default: 6)
    --verify-only           Only verify existing backups
    --cleanup-only          Only cleanup old backups

Environment Variables:
    BACKUP_DIR              Backup directory
    RETENTION_DAYS          Retention period in days
    POSTGRES_CONTAINER      PostgreSQL container name
    REDIS_CONTAINER         Redis container name
    NOTIFICATION_EMAIL      Email for notifications
    S3_BUCKET              S3 bucket name
    WEBHOOK_URL            Webhook URL for notifications
    COMPRESSION_LEVEL      Compression level

Examples:
    # Standard backup
    $0

    # Custom backup directory
    $0 --backup-dir /custom/backup/path

    # Backup with S3 upload
    S3_BUCKET=my-backup-bucket $0

    # Verify existing backups
    $0 --verify-only
EOF
}

# コマンドライン引数処理
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_usage
            exit 0
            ;;
        -d|--backup-dir)
            BACKUP_DIR="$2"
            shift 2
            ;;
        -r|--retention)
            RETENTION_DAYS="$2"
            shift 2
            ;;
        -e|--email)
            NOTIFICATION_EMAIL="$2"
            shift 2
            ;;
        -s|--s3-bucket)
            S3_BUCKET="$2"
            shift 2
            ;;
        -c|--compression)
            COMPRESSION_LEVEL="$2"
            shift 2
            ;;
        --verify-only)
            # 最新のバックアップを検証
            latest_backup=$(ls -1 "$BACKUP_DIR" | sort | tail -1)
            if [[ -n "$latest_backup" ]]; then
                verify_backup "$BACKUP_DIR/$latest_backup"
            else
                log_error "No backups found to verify"
                exit 1
            fi
            exit 0
            ;;
        --cleanup-only)
            cleanup_old_backups
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# メイン実行
main "$@"