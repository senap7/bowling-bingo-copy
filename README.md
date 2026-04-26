# Bowling Bingo

ボウリングのスコア進行に合わせてビンゴを楽しめる、TypeScript 製の Web アプリです。  
フロントエンド（React + Vite）とバックエンド（Express + tRPC）を 1 つのリポジトリで管理しています。

## 技術スタック

- **Frontend**: React 19, Vite, Tailwind CSS, Radix UI
- **Backend**: Node.js, Express, tRPC
- **Database**: MySQL + Drizzle ORM
- **Testing**: Vitest

## 必要要件

- Node.js 20 以上（推奨）
- pnpm
- MySQL（`DATABASE_URL` で接続）

## セットアップ

```bash
pnpm install
```

必要に応じて環境変数を設定してください（例: `.env`）。

主な環境変数:

- `DATABASE_URL`
- `JWT_SECRET`
- `OAUTH_SERVER_URL`
- `OWNER_OPEN_ID`
- `BUILT_IN_FORGE_API_URL`
- `BUILT_IN_FORGE_API_KEY`
- `VITE_APP_ID`

## 開発

```bash
pnpm dev
```

## ビルド & 本番起動

```bash
pnpm build
pnpm start
```

## テスト / チェック

```bash
pnpm test
pnpm check
```

## データベースマイグレーション

```bash
pnpm db:push
```

## ディレクトリ構成（抜粋）

```text
client/   # React フロントエンド
server/   # Express + tRPC バックエンド
shared/   # 共有型・ロジック
drizzle/   # Drizzle 関連（schema / migrations）
```

> Note: プロジェクト固有の運用ルールや仕様がある場合は、この README に追記してください。
