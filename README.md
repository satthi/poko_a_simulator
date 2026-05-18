# ぽこあポケモン シミュレーションWebアプリ

このプロジェクトは「ぽこあポケモン」のシミュレーションを行うWebアプリです。

## 概要
- 初期に縦横高さのサイズを設定
- 2Dでブロックを配置（高さは別途設定）
- ブロックはマスタ登録し、使用数をカウント
- 3Dで完成イメージを表示

## 技術スタック
- バックエンド: Laravel (API), Inertia.js
- フロントエンド: React (TypeScript), MUI, react-konva, react-three-fiber, drei
- データベース: PostgreSQL
- 開発環境: Docker

---

## セットアップ・起動方法

### 前提条件
- Docker がインストールされていること
- Docker Compose がインストールされていること

### 初期セットアップ

1. **依存パッケージをインストール**
```bash
docker-compose exec app composer install
docker-compose exec app npm install
```

2. **APP_KEY を生成**
```bash
docker-compose exec app php artisan key:generate
```

3. **データベースをセットアップ**
```bash
docker-compose exec app php artisan migrate
```

4. **フロントエンドをビルド**
```bash
docker-compose exec app npm run build
```

### 起動方法

```bash
docker-compose up -d
```

ポートを変更したい場合は `.env` の以下を変更してください（デフォルトは `WEB_PORT=8000`, `VITE_PORT=5173`）。

```dotenv
WEB_PORT=8000
VITE_PORT=5173
```

アプリケーションは以下のURLでアクセス可能になります：
- **http://localhost:8000**

### 停止方法

```bash
docker-compose down
```

### 開発コマンド

**Laravel コマンド実行：**
```bash
docker-compose exec app php artisan <command>
```

**npm コマンド実行：**
```bash
docker-compose exec app npm run <script>
```

**Vite 開発サーバー起動：**
```bash
docker-compose exec app npm run dev
```

**データベースアクセス：**
```bash
docker-compose exec db psql -U postgres -d poko_a_simulator
```
