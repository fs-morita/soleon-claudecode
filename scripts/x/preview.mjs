#!/usr/bin/env node
// これから流れる投稿を、日時つきで表示する。
// API を使わず X の予約投稿画面に手で貼る運用でも、そのまま使える。
//
//   node scripts/x/preview.mjs          直近 15 本
//   node scripts/x/preview.mjs 50       直近 50 本

import { loadQueue, renderPost } from './lib/queue.mjs';
import { resolveIndex, describeIndex } from './lib/schedule.mjs';
import { weightedLength } from './lib/tweet-length.mjs';

const count = Number(process.argv[2]) || 15;
const queue = await loadQueue();
const start = Math.max(0, resolveIndex(queue));

for (let i = start; i < Math.min(start + count, queue.posts.length); i++) {
  const text = renderPost(queue.posts[i]);
  console.log(`\n========== ${describeIndex(queue, i)} (${weightedLength(text)}字) ==========`);
  console.log(text);
}
