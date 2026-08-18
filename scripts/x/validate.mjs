#!/usr/bin/env node
// キューの機械的な検査。CI とローカルの両方で走らせる。
//  - 文字数が X の上限に収まっているか
//  - slug に対応する記事が実在し、下書きでないか
//  - 同じ記事・同じ本文が重複していないか（X は同一本文を弾く）
//  - 同じカテゴリが連続しすぎていないか

import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { loadQueue, renderPost } from './lib/queue.mjs';
import { weightedLength, MAX_WEIGHTED } from './lib/tweet-length.mjs';

const ARTICLES_DIR = fileURLToPath(new URL('../../src/content/articles/', import.meta.url));
const MAX_SAME_CATEGORY_RUN = 2;

async function readArticles() {
  const files = (await readdir(ARTICLES_DIR)).filter((f) => f.endsWith('.md'));
  const map = new Map();
  for (const file of files) {
    const raw = await readFile(new URL(file, `file://${ARTICLES_DIR}`), 'utf8');
    const front = raw.split('---')[1] ?? '';
    map.set(file.replace(/\.md$/, ''), {
      category: front.match(/^category:\s*"(.+)"/m)?.[1] ?? '',
      draft: /^draft:\s*true/m.test(front),
      title: front.match(/^title:\s*"(.+)"/m)?.[1] ?? '',
    });
  }
  return map;
}

const errors = [];
const warnings = [];

const queue = await loadQueue();
const articles = await readArticles();

const seenSlugs = new Map();
const seenTexts = new Map();
let categoryRun = { name: null, count: 0 };

queue.posts.forEach((post, i) => {
  const where = `#${i} (${post.slug})`;

  const length = weightedLength(renderPost(post));
  if (length > MAX_WEIGHTED) errors.push(`${where} 文字数超過: ${length} > ${MAX_WEIGHTED}`);

  const article = articles.get(post.slug);
  if (!article) errors.push(`${where} 記事が存在しません`);
  else if (article.draft) errors.push(`${where} 下書き記事を参照しています`);

  if (seenSlugs.has(post.slug)) errors.push(`${where} 記事が重複: #${seenSlugs.get(post.slug)}`);
  else seenSlugs.set(post.slug, i);

  const normalized = post.text.replace(/\s+/g, '');
  if (seenTexts.has(normalized)) errors.push(`${where} 本文が重複: #${seenTexts.get(normalized)}`);
  else seenTexts.set(normalized, i);

  if (/https?:\/\//.test(post.text)) {
    errors.push(`${where} 本文に URL が含まれています（URL は自動で末尾に付きます）`);
  }

  const category = article?.category ?? '';
  if (category === categoryRun.name) {
    categoryRun.count++;
    if (categoryRun.count > MAX_SAME_CATEGORY_RUN) {
      warnings.push(`${where} 同じカテゴリ「${category}」が ${categoryRun.count} 連続`);
    }
  } else {
    categoryRun = { name: category, count: 1 };
  }
});

const days = Math.floor(queue.posts.length / queue.slots.length);
console.log(`投稿数: ${queue.posts.length} 本 / ${queue.slots.length} 本per日 = 約 ${days} 日分`);
console.log(`記事総数: ${articles.size} 本（未使用 ${articles.size - seenSlugs.size} 本）`);

for (const w of warnings) console.log(`警告: ${w}`);
for (const e of errors) console.error(`エラー: ${e}`);

if (errors.length) {
  console.error(`\n${errors.length} 件のエラー。`);
  process.exit(1);
}
console.log('\n検査を通過しました。');
