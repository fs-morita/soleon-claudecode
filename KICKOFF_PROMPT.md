# Claude Code キックオフプロンプト

VS Code でプロジェクト用の空フォルダを開き、この `KICKOFF_PROMPT.md` と `CLAUDE.md`、
`content/articles/` をそのフォルダ直下に置いた状態で、Claude Code に以下をそのまま貼り付けてください。

---

このフォルダに `CLAUDE.md` があります。まずそれを読んで、プロジェクトの全体仕様を把握してください。
そのうえで、`claudecode.soleon.jp` 向けの Astro サイトを次の順で構築してください。

1. Astro プロジェクトを最新版で初期化し、`@astrojs/sitemap` を追加する。
2. `astro.config.mjs` に `site: 'https://claudecode.soleon.jp'` と sitemap 統合を設定する。
3. `src/content/config.ts` を CLAUDE.md のスキーマ（title/description/pubDate/updatedDate/category/tags/draft）で作成する。
4. このフォルダの `content/articles/*.md`（8本）を `src/content/articles/` にコピーして記事として使う。
5. `src/styles/global.css` にダーク基調・ミニマルのブランド変数を定義する（CLAUDE.mdの色を暫定採用）。
6. `BaseLayout` と、SEOメタ＋OGP＋JSON-LD(Article/Organization) を出す `BaseHead` を実装する。
7. ページを実装する: トップLP（index）→ 記事一覧（/articles）→ 記事詳細（/articles/[...slug]）→ DX診断（/check）。
   - トップLPの構成は CLAUDE.md の「トップLPの構成」に従う。
   - DX診断はバックエンド不要のクライアント側だけの簡易診断にする。
8. 問い合わせフォーム `ContactForm` を実装する。送信先は環境変数 `PUBLIC_CONTACT_ENDPOINT` を使い、
   未設定でもフォーム自体は表示され、送信時に案内が出る形にする。honeypot を必ず入れる。
9. `public/robots.txt` を作り、sitemap を参照させる。
10. `.github/workflows/deploy.yml` を作る（main への push で build → S3 sync → CloudFront invalidation。
    認証は GitHub OIDC。バケット名等はシークレット参照でプレースホルダのままでよい）。
11. 最後に `npm run build` が通ることを確認し、通らなければ直す。

実装の途中で仕様の判断に迷ったら、CLAUDE.md の記述を優先してください。
実在しない顧客導入事例（社名・具体的な成果数値）は絶対に作らないでください。

---

## この後の流れ（AWS 公開）

サイトが `npm run build` で通ったら、次は AWS 側の準備です。困ったら Cowork の会話に戻って相談してください。
- S3 バケット作成（非公開）＋ CloudFront（OAC）＋ ACM 証明書（us-east-1）
- お名前.com に CNAME を2つ追加（ACM検証用＋ `claudecode` → CloudFrontドメイン）
- GitHub Actions 用の AWS ロール（OIDC）とシークレット設定
- 問い合わせフォーム用に API Gateway + Lambda + SES を構築し、`PUBLIC_CONTACT_ENDPOINT` を設定
