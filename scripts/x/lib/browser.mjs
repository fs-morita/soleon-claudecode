// Chromium を、ログイン状態を保ったまま開くための共通処理。
import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

// ログインの Cookie が入るので、絶対に commit しない（.gitignore 済み）
export const PROFILE_DIR = fileURLToPath(new URL('../.browser-profile', import.meta.url));

/** Playwright がキャッシュしている Chromium の実体を探す。 */
function findChromium() {
  const base = `${process.env.HOME}/.cache/ms-playwright`;
  if (!existsSync(base)) return null;

  const candidates = readdirSync(base)
    .filter((d) => d.startsWith('chromium-'))
    .sort()
    .reverse();

  for (const dir of candidates) {
    for (const rel of ['chrome-linux64/chrome', 'chrome-linux/chrome']) {
      const path = `${base}/${dir}/${rel}`;
      if (existsSync(path)) return path;
    }
  }
  return null;
}

export async function openBrowser({ headless = false } = {}) {
  const executablePath = findChromium();
  if (!executablePath) {
    throw new Error(
      'Chromium が見つかりません。`npx playwright install chromium` を実行してください。',
    );
  }

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    executablePath,
    headless,
    viewport: { width: 1280, height: 900 },
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = context.pages()[0] ?? (await context.newPage());
  return { context, page };
}

/** ログイン済みかを確かめる。未ログインならその旨を投げる。 */
export async function requireLogin(page, selector) {
  await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded' });
  try {
    await page.waitForSelector(selector, { timeout: 20_000 });
  } catch {
    throw new Error(
      'X にログインしていません。先に `npm run x:browser -- --login` を実行して、\n' +
        '開いたウィンドウで手作業でログインしてください（認証情報はこちらでは扱いません）。',
    );
  }
}

/** 人が操作しているのに近い間隔を空ける。 */
export const humanPause = (min, max) =>
  new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));
