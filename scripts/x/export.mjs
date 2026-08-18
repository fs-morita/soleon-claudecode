#!/usr/bin/env node
// 投稿文を、X の予約投稿画面に貼れる形で書き出す。
//
//   npm run x:export                          次の 7 日分（35 本）
//   npm run x:export -- --from 35             36 本目から
//   npm run x:export -- --count 10            10 本だけ
//   npm run x:export -- --per-day 2           1 日 2 本の日付割りで
//   npm run x:export -- --out week1.txt       ファイルに書き出す
//
// 「どこまで予約したか」は --from の数字で管理する。
// 表示される [37] のような番号がキューの位置なので、次はそこから続ける。

import { writeFile } from 'node:fs/promises';
import { loadQueue, renderPost } from './lib/queue.mjs';
import { weightedLength } from './lib/tweet-length.mjs';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
const MS_PER_DAY = 86_400_000;

function parseArgs(argv) {
  const args = { from: 0, count: null, perDay: null, start: null, out: null, days: 7 };
  for (let i = 0; i < argv.length; i++) {
    const next = () => argv[++i];
    if (argv[i] === '--from') args.from = Number(next());
    else if (argv[i] === '--count') args.count = Number(next());
    else if (argv[i] === '--per-day') args.perDay = Number(next());
    else if (argv[i] === '--days') args.days = Number(next());
    else if (argv[i] === '--start') args.start = next();
    else if (argv[i] === '--out') args.out = next();
  }
  return args;
}

function dateLabel(startDate, dayOffset) {
  const d = new Date(Date.parse(`${startDate}T00:00:00Z`) + dayOffset * MS_PER_DAY);
  const [, month, day] = d.toISOString().slice(0, 10).split('-');
  return `${Number(month)}/${Number(day)} (${WEEKDAYS[d.getUTCDay()]})`;
}

const args = parseArgs(process.argv.slice(2));
const queue = await loadQueue();

const slots = args.perDay ? queue.slots.slice(0, args.perDay) : queue.slots;
const startDate = args.start ?? queue.startDate;
const count = args.count ?? slots.length * args.days;
const end = Math.min(args.from + count, queue.posts.length);

const lines = [];
const out = (s = '') => lines.push(s);

out(`X 予約投稿用  ${args.from + 1} 〜 ${end} 本目（全 ${queue.posts.length} 本）`);
out(`1 日 ${slots.length} 本 / ${startDate} 起点の日付割り`);
out(`次回は  npm run x:export -- --from ${end}  から`);
out();

let previousDay = -1;
for (let i = args.from; i < end; i++) {
  const position = i - args.from;
  const dayOffset = Math.floor(position / slots.length);
  const slot = slots[position % slots.length];

  if (dayOffset !== previousDay) {
    previousDay = dayOffset;
    out();
    out('='.repeat(48));
    out(`  ${dateLabel(startDate, dayOffset)}`);
    out('='.repeat(48));
  }

  const text = renderPost(queue.posts[i]);
  out();
  out(`--- [${i + 1}] ${slot}  (${weightedLength(text)}字) ---`);
  out(text);
}

out();

const result = lines.join('\n');
if (args.out) {
  await writeFile(args.out, result + '\n', 'utf8');
  console.log(`${args.out} に ${end - args.from} 本を書き出しました。`);
} else {
  console.log(result);
}
