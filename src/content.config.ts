import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const articles = defineCollection({
  // src/content/articles/ 配下の .md を読み込む（Astro 5+ の glob ローダー）
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    // メタディスクリプション兼用（120字前後）
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z.enum(['入門', '実装事例']),
    tags: z.array(z.string()).default([]),
    // true の記事はビルドから除外
    draft: z.boolean().default(false),
  }),
});

export const collections = { articles };
