#!/usr/bin/env node
// キューから今の枠の 1 本を X に投稿する。
//
//   node scripts/x/post.mjs --dry-run     送る内容だけ表示して終わる
//   node scripts/x/post.mjs --index 12    枠の計算を無視して 12 番目を送る
//
// 資格情報が無いときは投稿せず終了する（CI を落とさない）。

import { authHeader, credentialsFromEnv } from './lib/oauth.mjs';
import { loadQueue, renderPost } from './lib/queue.mjs';
import { resolveIndex, describeIndex } from './lib/schedule.mjs';
import { weightedLength, MAX_WEIGHTED } from './lib/tweet-length.mjs';

const ENDPOINT = 'https://api.twitter.com/2/tweets';

function parseArgs(argv) {
  const args = { dryRun: false, index: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry-run') args.dryRun = true;
    else if (argv[i] === '--index') args.index = Number(argv[++i]);
  }
  return args;
}

async function publish(text, credentials) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: authHeader({ method: 'POST', url: ENDPOINT, credentials }),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`X API ${res.status}: ${body}`);
  }
  return JSON.parse(body);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const queue = await loadQueue();
  const index = args.index ?? resolveIndex(queue);

  if (index < 0) {
    console.log(`開始日 ${queue.startDate} より前です。何もしません。`);
    return;
  }
  if (index >= queue.posts.length) {
    console.log(
      `キューを使い切りました（${queue.posts.length} 本）。記事を追加して queue.json を伸ばしてください。`,
    );
    return;
  }

  const post = queue.posts[index];
  const text = renderPost(post);
  const length = weightedLength(text);

  console.log(`枠: ${describeIndex(queue, index)}  (index ${index} / ${queue.posts.length})`);
  console.log(`長さ: ${length} / ${MAX_WEIGHTED}`);
  console.log('---');
  console.log(text);
  console.log('---');

  if (length > MAX_WEIGHTED) {
    throw new Error(`文字数超過のため送信しません（${length} > ${MAX_WEIGHTED}）`);
  }
  if (args.dryRun) {
    console.log('--dry-run のため送信しません。');
    return;
  }

  const credentials = credentialsFromEnv();
  if (!credentials) {
    console.log('X の資格情報が未設定のため送信しません（X_API_KEY 他を確認）。');
    return;
  }

  const result = await publish(text, credentials);
  console.log(`投稿しました: https://x.com/i/status/${result.data.id}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
