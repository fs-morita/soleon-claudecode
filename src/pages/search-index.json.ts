import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

// 記事一覧のキーワード絞り込み用インデックス。
// 一覧ページは21件ずつのページングなので、検索は全記事を対象にする必要がある。
// ページ本体を軽く保つため、初回の検索操作時にこのJSONを取りに行く。
export const GET: APIRoute = async () => {
  const articles = (
    await getCollection('articles', ({ data }) => data.draft !== true)
  )
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
    .map((a) => ({
      s: a.id, // slug
      t: a.data.title, // title
      c: a.data.category, // category
      g: a.data.tags.join(' '), // tags
    }));

  return new Response(JSON.stringify(articles), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
