# CLAUDE.md — claudecode.soleon.jp 実装ガイド

このファイルは Claude Code がプロジェクトの前提として自動的に読み込みます。
以下の仕様に沿ってサイトを実装してください。

## プロジェクト概要

株式会社SOLEON（製造業向けDX支援）の集客用サイトを、`claudecode.soleon.jp`（soleon.jp のサブドメイン）に構築する。
コンセプトは「**製造業向け Claude Code / AI 活用 事例集**」。SEOで検索流入を集め、記事・DX診断で信頼を獲得し、
問い合わせフォームからSOLEON本体サービス（戦略支援・試作支援サブスク）の商談につなげる。

参考にした構造は digirise の `claudecode.digirise.ai`（SEOに強い1枚LP＋記事＋診断＋問い合わせ導線）。

## 技術スタック

- **静的サイトジェネレータ: Astro（最新版）**。ビルド結果は素の静的HTML/CSS/JS。
- 記事は **Markdown（Content Collections）** で管理し、`src/content/articles/` に `.md` を追加すれば増える。
- インタラクションが要る箇所（DX診断など）だけ軽量にJSを使う。
- SEO統合として `@astrojs/sitemap` を入れ、`sitemap.xml` を自動生成する。
- パッケージは npm で管理。まず `npm create astro@latest` 相当の最小構成から入れてよい。

## ディレクトリ構成（目標）

```
soleon-claudecode/
├─ src/
│  ├─ pages/
│  │  ├─ index.astro          # トップLP
│  │  ├─ articles/index.astro # 記事一覧
│  │  ├─ articles/[...slug].astro # 記事詳細
│  │  └─ check.astro          # DX診断
│  ├─ content/
│  │  ├─ config.ts            # articles コレクション定義（zodスキーマ）
│  │  └─ articles/            # ← 同梱の .md をここに配置
│  ├─ components/             # Header / Footer / BaseHead(SEO) / ContactForm / ArticleCard / DxCheck
│  ├─ layouts/                # BaseLayout / ArticleLayout
│  └─ styles/global.css
├─ public/                    # favicon / og画像 / robots.txt
├─ astro.config.mjs           # site: 'https://claudecode.soleon.jp', sitemap統合
└─ .github/workflows/deploy.yml
```

## コンテンツ（記事）スキーマ

`src/content/config.ts` の articles コレクションは次のフロントマターを想定：

```ts
{
  title: string,
  description: string,       // メタディスクリプション兼用（120字前後）
  pubDate: Date,
  updatedDate: Date | undefined,
  category: '入門' | '実装事例',
  tags: string[],
  draft: boolean,            // true の記事はビルドから除外
}
```

同梱の `content/articles/*.md` はこのスキーマに合わせてある。そのまま `src/content/articles/` にコピーして使う。

## トップLP（index.astro）の構成

上から順に:
1. ヒーロー: キャッチコピー＋サブコピー＋CTAボタン（「無料でDX診断」「お問い合わせ」）
2. 課題提起: 製造業がDXでつまずく点（人手不足・属人化・IT人材不在 など）
3. 提供価値: SOLEONは「製造業の社外戦略室」。Claude Code/AIで現場の業務を小さく自動化。
4. Claude Code活用イメージ: 何ができるかを3〜4枚のカードで
5. 活用事例（記事）抜粋: 最新記事を数枚カード表示 → 記事一覧へ
6. DX診断への誘導バナー
7. 問い合わせフォーム（ContactForm）
8. フッター（会社情報・soleon.jp本体へのリンク）

## デザイン方針

SOLEON本体サイト（soleon.jp）に合わせる。ダーク基調・ミニマル・余白広め・アクセント1色。
`src/styles/global.css` にCSS変数で定義（例）:
- 背景 `--bg: #0b0d10;` テキスト `--fg: #e8eaed;` ミュート `--muted: #9aa1ab;`
- アクセント `--accent: #5b8cff;`（1色に絞る。多用しない）
- 角丸・境界は控えめ、装飾より余白で見せる。
ロゴ・正式カラーは soleon.jp から取得、または SOLEON から支給予定（暫定は上記でよい）。

## SEO 実装（最初から必須）

- `BaseHead.astro` に title / description / canonical / OGP(og:title, og:description, og:image, og:type) / Twitterカードを実装。
- 記事詳細に **JSON-LD 構造化データ**（`Article`）、全ページ共通で `Organization` を出力。
- `@astrojs/sitemap` で `sitemap.xml`、`public/robots.txt` で sitemap を参照。
- 狙うキーワードは「製造業 DX」を軸に、記事ごとのロングテール（各記事のtags参照）。
- 表示速度（Core Web Vitals）を意識。画像は最適化、不要なJSを載せない。
- 公開後 Google Search Console と GA4 を接続（測定タグは環境変数か直書きで可、後で差し替え）。

## 問い合わせフォーム（ContactForm）

静的ページから **AWS サーバレス**のエンドポイントへ `fetch` でPOSTする想定。
- 送信先は `PUBLIC_CONTACT_ENDPOINT`（環境変数）に置く。未設定時は送信をブロックし案内表示。
- 送る項目: 会社名 / 担当者名 / メール / 問い合わせ内容。
- スパム対策: honeypot（隠しフィールド）を必ず入れる。将来 reCAPTCHA 追加可能に。
- 送信成功でサンクス表示＋次アクション（資料・面談予約）への導線を出す。
- バックエンド（API Gateway + Lambda + SES）は別途構築。まずフロントは endpoint 未定でも動く形にする。

## DX診断（check.astro）

クライアント側だけで完結する簡易診断（バックエンド不要）。
- 5〜7問の設問（製造業のDX成熟度をはかる）に回答 → スコア算出 → タイプ別の結果とコメント表示。
- 結果画面の最後に「詳しく相談する」= 問い合わせフォームへのCTA。
- 回答データを送りたくなったら ContactForm と同じ endpoint に送る拡張余地を残す。

## デプロイ（.github/workflows/deploy.yml）

`main` への push で: `npm ci` → `npm run build` → `aws s3 sync ./dist s3://<bucket> --delete` → CloudFront invalidation。
認証は GitHub の OIDC で AWS ロールを assume する方式を推奨（アクセスキー直書きは避ける）。
必要なシークレット: `AWS_ROLE_ARN` / `AWS_REGION` / `S3_BUCKET` / `CLOUDFRONT_DISTRIBUTION_ID`。

## AWS インフラ（参考・別途構築）

- 配信: S3(非公開) + CloudFront(OAC) + ACM(us-east-1で証明書) + Route53 もしくは お名前.com にCNAME追記。
- フォーム: API Gateway(HTTP API) → Lambda → SES（通知＋自動返信）。リード保存が要れば DynamoDB。
- DNSは お名前.com 管理。移行せず、`claudecode` サブドメインのCNAME（証明書検証用＋CloudFront配信用）を追加する方針。

## 記事の自動更新（フェーズ後半）

- 方式A（推奨・半自動）: GitHub Actions cron が記事Markdownを生成しPRを作成 → 人が確認しmerge → 自動公開。
- 方式B（完全自動）: cronがAPIで記事生成 → 直接commit → 自動公開。
- いずれもテーマは製造業DXに限定し、中身の薄い量産を避ける（SEO評価と信頼のため）。

## 重要な注意（事実性）

SOLEONは登記直後で実案件はこれから。**実在の顧客導入事例（社名・具体的な成果数値）を捏造しない**こと。
記事・LPは「こう使えばこう効率化できる」という再現可能な実装ガイド／想定シナリオとして書く。
実績が出たら、その時点で本物の事例に差し替える。

## 実装の進め方（推奨順）

1. `npm create astro@latest`（最小 or 空テンプレ, TypeScript可）でプロジェクト作成、`@astrojs/sitemap` 追加。
2. `astro.config.mjs` に `site` と sitemap 統合を設定。
3. `src/content/config.ts` を上記スキーマで作成し、同梱記事を `src/content/articles/` に配置。
4. `global.css` とブランド変数、`BaseLayout` / `BaseHead`(SEO) を用意。
5. トップLP → 記事一覧 → 記事詳細 → DX診断 の順にページ実装。
6. `ContactForm` を endpoint 環境変数対応で実装。
7. `npm run build` が通ることを確認。
8. `.github/workflows/deploy.yml` を追加（バケット等は後で設定）。
