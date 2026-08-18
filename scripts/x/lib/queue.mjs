import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const QUEUE_PATH = fileURLToPath(new URL('../queue.json', import.meta.url));
const SITE = 'https://claudecode.soleon.jp';

export async function loadQueue(path = QUEUE_PATH) {
  return JSON.parse(await readFile(path, 'utf8'));
}

export function articleUrl(slug) {
  return `${SITE}/blog/${slug}/`;
}

/** 投稿として実際に送る文字列。本文の末尾に記事 URL を足すだけ。 */
export function renderPost(post) {
  return `${post.text}\n\n${articleUrl(post.slug)}`;
}

export { QUEUE_PATH };
