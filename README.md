# SOLEON claudecode.soleon.jp 引き継ぎ一式

このフォルダは、`claudecode.soleon.jp`（製造業向け Claude Code 活用事例集）を
**Claude Code で実装するための引き継ぎパッケージ**です。

## 中身

- `CLAUDE.md` … プロジェクトの全仕様。Claude Code が自動で読み込む前提ファイル。
- `KICKOFF_PROMPT.md` … Claude Code に最初に貼り付ける指示文。
- `content/articles/*.md` … 初回記事8本（入門2本＋実装事例6本）。すぐ公開に使える中身。
- `README.md` … このファイル。

## 使い方

1. VS Code でこのサイト用の空フォルダを開く（例: `soleon-claudecode`）。
2. このフォルダの中身（`CLAUDE.md` / `KICKOFF_PROMPT.md` / `content/`）をその直下に置く。
3. Claude Code を起動し、`KICKOFF_PROMPT.md` の本文を貼り付けて実行する。
4. Claude Code が Astro サイトを構築 → `npm run build` まで確認。
5. 公開（AWS）の段になったら、Cowork の会話に戻って相談する。

## 記事について

8本は「実装ガイド／想定シナリオ」型で書いてあり、実在顧客の事例は含みません
（SOLEONは登記直後のため）。実案件が出たら本物の事例に差し替えてください。
以降の記事は、この会話（Cowork）で追加分をまとめて作成できます。

## 開発（このリポジトリ）

Astro（最新版）で構築済みです。**Node.js 22 以上**が必要です（`.nvmrc` あり）。

```bash
nvm use          # .nvmrc の Node 22 に切り替え
npm ci           # 依存インストール
npm run dev      # http://localhost:4321 で開発サーバ
npm run build    # ./dist に静的サイトを出力
npm run preview  # ビルド結果をローカル確認
```

- 記事を増やす: `src/content/articles/` に `.md` を追加（フロントマターは `src/content.config.ts` のスキーマ準拠）。`draft: true` はビルド除外。
- 問い合わせ送信先: 環境変数 `PUBLIC_CONTACT_ENDPOINT`（`.env.example` 参照）。未設定でもフォームは表示され、送信時に案内が出ます。
- デプロイ: `main` への push で `.github/workflows/deploy.yml` が build → S3 sync → CloudFront invalidation を実行（GitHub OIDC。バケット等はリポジトリシークレットで設定）。
