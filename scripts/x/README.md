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
node scripts/x/validate.mjs      # キューの検査（文字数・記事の実在・重複）
node scripts/x/preview.mjs 20    # これから流れる 20 本を日時つきで表示
node scripts/x/post.mjs --dry-run        # 今の枠の 1 本を、送らずに確認
node scripts/x/post.mjs --index 3 --dry-run  # 3 番目を確認
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

## X API の資格情報

無料枠（Free）で足りる。投稿は月 500 件まで、1 日 5 回なら月およそ 150 件。
※ X の料金体系は変わることがあるので、登録時に現在の上限を確認すること。

1. https://developer.x.com/ で開発者アカウントを作る
2. Project と App を作る
3. App の **User authentication settings** で
   - App permissions を **Read and write** にする（Read only のままだと投稿できない）
   - Type of App は **Web App / Automated App or Bot**
4. **Keys and tokens** から 4 つを発行する
   - API Key / API Key Secret
   - Access Token / Access Token Secret
     （権限を Read and write に変えた場合は、Access Token を**再発行**する。
     　権限変更前に発行したトークンは読み取り専用のまま）
5. GitHub リポジトリの Settings → Secrets and variables → Actions に登録する

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
