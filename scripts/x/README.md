# X 自動投稿

記事への流入をつくるために、1 日 5 回、キューの上から順に X へ投稿する。

## しくみ

`queue.json` は投稿の並んだ配列で、状態は持たない。
「開始日から何日目の、何番目の枠か」を実行時刻から計算して、その位置の 1 本を送る。

- 実行結果を保存しないので、状態ファイルも commit も要らない
- 実行が飛んだ枠はその 1 本を飛ばすだけで、次の枠は正しい位置から続く
- GitHub Actions の cron は数分〜十数分ずれるが、JST の時刻から最も近い枠を選ぶので問題ない

投稿枠は日本時間の 07:30 / 12:10 / 17:40 / 20:30 / 22:15。
記事の URL は `slug` から自動で組み立てて本文の末尾に付ける。`text` に URL を書く必要はない。

## 使い方

```sh
npm run x:validate               # キューの検査（文字数・記事の実在・重複）
npm run x:preview 20             # これから流れる 20 本を日時つきで表示
npm run x:post -- --dry-run      # 今の枠の 1 本を、送らずに確認
npm run x:post -- --index 3 --dry-run   # 3 番目を確認
```

`validate.mjs` は PR でも自動で走る。以下を機械的に見る。

- X の重み付き文字数が 280 を超えていないか（日本語は 1 文字 2、URL は 23 換算）
- `slug` の記事が実在し、下書きでないか
- 同じ記事・同じ本文が二度出てこないか（X は同一本文の連投を弾く）
- 本文に URL が直接書かれていないか
- 同じカテゴリが 3 本以上続いていないか（警告のみ）

## 投稿を足す

`queue.json` の `posts` の**末尾に足す**。途中に挿すと以降の投稿日がすべてずれる。

```json
{ "slug": "243-sheet-metal-unfold", "text": "本文。URL は書かない。" }
```

## 費用（重要）

**無料枠は無い。** X は 2026-02-06 に新規開発者向けの無料枠を廃止し、
従量課金（Pay Per Use）を既定にした。ダッシュボードのプロジェクト名が
`Default project - ... (Pay Per Use)` になっていれば従量課金。

| 投稿の種類 | 単価 |
| --- | --- |
| テキストのみ | $0.015 |
| URL を含む | $0.20 |

**この仕組みは記事 URL を貼るので、1 件あたり $0.20 になる。**

| 頻度 | 月あたり | 442 本を流し切るまで |
| --- | --- | --- |
| 1 日 5 回 | 150 件 = $30（約 4,500 円） | 88 日 / 約 $88 |
| 1 日 3 回 | 90 件 = $18（約 2,700 円） | 148 日 / 約 $88 |
| 1 日 2 回 | 60 件 = $12（約 1,800 円） | 221 日 / 約 $88 |

総額は頻度によらず約 $88。頻度で変わるのは月々の負担と、流し切るまでの期間。

`npm run x:validate` が現在の設定での費用見込みを表示する。

## X API の資格情報

1. https://developer.x.com/ で開発者アカウントを作る
2. Project と App を作る
3. **左メニューの「支払い」「クレジット」から支払い設定を済ませる**
   （未設定だと API 呼び出しが通らない）
4. App の **User authentication settings** で
   - App permissions を **Read and write** にする（Read only のままだと投稿できない）
   - Type of App は **Web App / Automated App or Bot**
5. **Keys and tokens** から 4 つを発行する
   - API Key / API Key Secret
   - Access Token / Access Token Secret
     （権限を Read and write に変えた場合は、Access Token を**再発行**する。
     　権限変更前に発行したトークンは読み取り専用のまま）
6. GitHub リポジトリの Settings → Secrets and variables → Actions に登録する

| Secret 名 | 中身 |
| --- | --- |
| `X_API_KEY` | API Key |
| `X_API_SECRET` | API Key Secret |
| `X_ACCESS_TOKEN` | Access Token |
| `X_ACCESS_SECRET` | Access Token Secret |

資格情報が未設定でもワークフローは落ちない。投稿せずに終わる。

## API を使わない運用

`preview.mjs` の出力を X の予約投稿画面に貼れば、API 無しでも同じ内容を同じ日時で流せる。
無料枠が使えなかった場合や、しばらく手で様子を見たい場合はこちら。

## 注意

- GitHub Actions の scheduled workflow は、リポジトリが 60 日間更新されないと自動で止まる
- 1 本目を流す前に、必ず `--dry-run` で内容を確認する
- 記事を増やしたら `queue.json` も伸ばす。使い切ると投稿せずに終わる
