// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import icon from 'astro-icon';

// https://astro.build
export default defineConfig({
  site: 'https://claudecode.soleon.jp',
  integrations: [
    sitemap({
      // draft 記事などは各ページ側で 404 になるため、公開ページのみが sitemap に載る
      changefreq: 'weekly',
      priority: 0.7,
    }),
    icon(),
  ],
});
