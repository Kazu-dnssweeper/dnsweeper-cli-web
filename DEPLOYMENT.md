# DNSweeper プロダクション デプロイメント ガイド

## 📋 概要

このドキュメントでは、DNSweeperをプロダクション環境に展開する方法について説明します。DNSweeperは、CLI版とWeb版の両方を提供するDNS分析・管理プラットフォームです。

## 🚀 クイックスタート

### 前提条件

- Docker 20.10以上
- Docker Compose 2.0以上
- 最低4GB RAM、2CPU コア
- 20GB以上のディスク容量

### 1. リポジトリのクローン

```bash
git clone https://github.com/your-org/dnsweeper.git
cd dnsweeper
```

### 2. 環境設定

```bash
# 環境ファイルをコピー
cp .env.example .env

# 環境変数を編集
nano .env
```

### 3. デプロイ実行

```bash
# デプロイスクリプトを実行
./scripts/deploy.sh
```

## 🔧 詳細設定

### 環境変数設定

`.env`ファイルで以下の重要な設定を行ってください：

```bash
# セキュリティ
JWT_SECRET=your-super-secret-jwt-key-here-256-bit
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here-256-bit
BCRYPT_ROUNDS=12

# データベース
POSTGRES_PASSWORD=secure_production_password
REDIS_PASSWORD=secure_redis_production_password

# 外部API（オプション）
CLOUDFLARE_API_TOKEN=your-cloudflare-token
ROUTE53_ACCESS_KEY_ID=your-aws-access-key
ROUTE53_SECRET_ACCESS_KEY=your-aws-secret-key
```

### SSL証明書設定

#### 自己署名証明書（開発・テスト用）

```bash
mkdir -p nginx/ssl
openssl req -x509 -newkey rsa:4096 -keyout nginx/ssl/key.pem -out nginx/ssl/cert.pem -days 365 -nodes
```

#### Let's Encrypt証明書（本番用）

```bash
# Certbotを使用
docker run -it --rm --name certbot \
  -v "$PWD/nginx/ssl:/etc/letsencrypt" \
  -v "$PWD/nginx/ssl:/var/lib/letsencrypt" \
  certbot/certbot certonly --standalone \
  -d yourdomain.com
```

## 🏗️ アーキテクチャ

### サービス構成

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Nginx         │    │   Frontend       │    │   Backend       │
│   (Proxy/SSL)   │◄──►│   (React App)    │◄──►│   (Express API) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         │                        │                        ▼
         │                        │              ┌─────────────────┐
         │                        │              │   PostgreSQL    │
         │                        │              │   (Database)    │
         │                        │              └─────────────────┘
         │                        │                        │
         │                        │                        ▼
         │                        │              ┌─────────────────┐
         │                        │              │   Redis         │
         │                        │              │   (Cache)       │
         │                        │              └─────────────────┘
         ▼
┌─────────────────┐
│   DNSweeper CLI │
│   (Optional)    │
└─────────────────┘
```

### ポート構成

| サービス | 内部ポート | 外部ポート | 説明 |
|---------|-----------|-----------|------|
| Nginx | 80/443 | 80/443 | Webサーバー・リバースプロキシ |
| Frontend | 80 | 3000 | React Webアプリ |
| Backend | 3001 | 3001 | Express.js API |
| PostgreSQL | 5432 | 5432 | メインデータベース |
| Redis | 6379 | 6379 | キャッシュ・セッション |

## 🛠️ 運用管理

### ログ確認

```bash
# 全サービスのログ
docker-compose logs -f

# 特定サービスのログ
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### サービス管理

```bash
# サービス状況確認
docker-compose ps

# サービス再起動
docker-compose restart backend

# サービス停止
docker-compose down

# 完全クリーンアップ
docker-compose down -v --remove-orphans
```

### データベース管理

```bash
# データベースバックアップ
docker-compose exec postgres pg_dump -U dnsweeper dnsweeper > backup.sql

# バックアップからの復元
cat backup.sql | docker-compose exec -T postgres psql -U dnsweeper -d dnsweeper

# データベース接続
docker-compose exec postgres psql -U dnsweeper -d dnsweeper
```

### スケーリング

```bash
# バックエンドサービスをスケール
docker-compose up -d --scale backend=3

# ロードバランサー設定でNginx configを更新
```

## 🔒 セキュリティ

### 必須セキュリティ設定

1. **パスワード変更**
   ```bash
   # デフォルト管理者パスワードを変更
   # Web UI > Settings > Account > Change Password
   ```

2. **ファイアウォール設定**
   ```bash
   # 必要なポートのみ開放
   ufw allow 80
   ufw allow 443
   ufw allow 22  # SSH（管理用）
   ufw enable
   ```

3. **定期的な更新**
   ```bash
   # Docker images更新
   docker-compose pull
   docker-compose up -d
   
   # セキュリティアップデート
   apt update && apt upgrade -y
   ```

### 監査・ログ設定

```bash
# 監査ログの確認
docker-compose exec postgres psql -U dnsweeper -d dnsweeper -c "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 20;"

# アクセスログの確認
tail -f nginx/logs/access.log
```

## 📊 モニタリング

### ヘルスチェック

```bash
# API健全性確認
curl http://localhost:3001/health

# フロントエンド健全性確認
curl http://localhost:3000/health

# データベース健全性確認
docker-compose exec postgres pg_isready -U dnsweeper
```

### パフォーマンス監視

```bash
# リソース使用量確認
docker stats

# ディスク使用量確認
docker system df

# ログサイズ確認
du -sh nginx/logs/*
```

## 🚨 トラブルシューティング

### よくある問題

#### 1. サービスが起動しない

```bash
# ログで詳細確認
docker-compose logs servicename

# ポート競合確認
netstat -tulpn | grep :3001
```

#### 2. データベース接続エラー

```bash
# データベース状況確認
docker-compose exec postgres pg_isready -U dnsweeper

# 接続設定確認
docker-compose exec backend env | grep DATABASE_URL
```

#### 3. メモリ不足

```bash
# メモリ使用量確認
free -h
docker stats --no-stream

# Swap設定
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### ログファイル

| サービス | ログの場所 |
|---------|-----------|
| Nginx | `nginx/logs/` |
| Backend | `web/backend/logs/` |
| Application | `logs/` |
| Docker | `docker-compose logs` |

## 🔄 アップデート手順

### アプリケーション更新

```bash
# 1. リポジトリ更新
git pull origin main

# 2. 新しいイメージビルド
docker-compose build --no-cache

# 3. サービス更新（ダウンタイムあり）
docker-compose down
docker-compose up -d

# 4. ヘルスチェック
curl http://localhost:3001/health
```

### ローリングアップデート（ダウンタイムなし）

```bash
# 1. バックエンドサービスを順次更新
docker-compose up -d --no-deps backend

# 2. フロントエンド更新
docker-compose up -d --no-deps frontend

# 3. Nginx設定更新
docker-compose exec nginx nginx -s reload
```

## 📞 サポート

### 緊急時対応

1. **サービス復旧手順**
   ```bash
   # 緊急停止
   docker-compose down
   
   # 安全な再起動
   docker-compose up -d postgres redis
   sleep 10
   docker-compose up -d backend frontend nginx
   ```

2. **データ損失時の復旧**
   ```bash
   # 最新バックアップから復元
   docker-compose down
   # データベース復元手順実行
   docker-compose up -d
   ```

### ログとサポート情報

- **アプリケーションログ**: `logs/app.log`
- **エラーログ**: `logs/error.log`
- **アクセスログ**: `nginx/logs/access.log`
- **データベースログ**: `docker-compose logs postgres`

問題が発生した場合は、これらのログファイルと共にサポートにお問い合わせください。