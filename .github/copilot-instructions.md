# ぽこあポケモン シミュレーションWebアプリ - Copilot Instructions

## プロジェクト概要

このプロジェクトは「ぽこあポケモン」のシミュレーションを行うWebアプリです。

### 機能
- 初期に縦横高さのサイズを設定
- 2Dでブロックを配置（高さは別途設定）
- ブロックはマスタ登録し、使用数をカウント
- 3Dで完成イメージを表示

### 技術スタック
- **バックエンド:** Laravel 11+ (API with Inertia.js)
- **フロントエンド:** React 18+ (TypeScript), Inertia.js
- **UI フレームワーク:** Material-UI (MUI)
- **3D:** react-three-fiber, drei
- **2D:** react-konva
- **データベース:** PostgreSQL 15
- **開発環境:** Docker Compose

## 開発環境

### コンテナ構成
- **app:** PHP 8.2-FPM + Node.js (Laravel + npm)
- **webserver:** nginx
- **db:** PostgreSQL 15

### ポート
- **Laravel:** 8000
- **Vite HMR:** 5173
- **PostgreSQL:** 5432

## 起動方法

```bash
# 初回セットアップ
docker-compose up -d
docker-compose exec app composer install
docker-compose exec app npm install
docker-compose exec app php artisan key:generate
docker-compose exec app php artisan migrate

# 開発サーバー起動
docker-compose exec app npm run dev

# 起動確認
# ブラウザで http://localhost:8000 にアクセス
```

## ディレクトリ構成

```
.
├── app/                   # Laravel アプリケーション
├── resources/
│   ├── js/               # React コンポーネント (Inertia.js)
│   ├── views/            # Blade テンプレート
│   └── css/              # スタイルシート
├── routes/               # ルート定義
├── database/             # マイグレーション
├── docker/               # Docker 設定
│   ├── php/             # PHP 設定
│   ├── nginx/           # Nginx 設定
│   └── postgres/        # PostgreSQL 設定
├── public/               # 公開ディレクトリ
├── storage/              # ファイル保存先
└── vite.config.ts        # Vite 設定

## 重要な注意事項

- `.env` ファイルはコミットしない
- `/vendor`, `/node_modules`, `/public/build` は .gitignore に含まれる
- PostgreSQL は `/var/lib/postgresql/data` にボリュームで永続化
- PHP は php-fpm で実行（Nginx 経由）

## トラブルシューティング

### コンテナが起動しない
```bash
docker-compose logs app
docker-compose logs webserver
docker-compose logs db
```

### npm / composer のキャッシュクリア
```bash
docker-compose exec app rm -rf vendor node_modules
docker-compose exec app composer install
docker-compose exec app npm install
```

### データベースリセット
```bash
docker-compose down -v  # ボリュームを削除
docker-compose up -d
docker-compose exec app php artisan migrate
```

## 参考リンク
- [Laravel Documentation](https://laravel.com/docs)
- [Inertia.js](https://inertiajs.com)
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
