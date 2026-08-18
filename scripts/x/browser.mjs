#!/usr/bin/env node
// キューの投稿を、Chromium 上の X の予約投稿画面に登録する。
//
//   npm run x:browser -- --login          最初に一度。手作業でログインする
//   npm run x:browser -- --check          画面の要素が全部見つかるかを確認する（投稿しない）
//   npm run x:browser -- --dry-run        入力まで行い、確定ボタンは押さない
//   npm run x:browser -- --from 0 --count 10   実際に予約する
//
// 安全のための決まりごと
//   - 既定は画面を出す。何が起きているか見える状態で動かす
//   - 要素が 1 つでも見つからなければ、その場で止まる。次に進まない
//   - 1 本ごとに登録できたかを確かめる。確かめられなければ止まる
//   - 登録済みの番号は .progress.json に記録し、二重登録を防ぐ

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadQueue, renderPost } from './lib/queue.mjs';
import { weightedLength, MAX_WEIGHTED } from './lib/tweet-length.mjs';
import { SELECTORS, DATE_FIELD_HINTS } from './lib/selectors.mjs';
import { openBrowser, requireLogin, humanPause } from './lib/browser.mjs';

const PROGRESS_PATH = fileURLToPath(new URL('./.progress.json', import.meta.url));
const COMPOSE_URL = 'https://x.com/compose/post';
const MS_PER_DAY = 86_400_000;

function parseArgs(argv) {
  const args = {
    login: false, check: false, dryRun: false, headless: false, force: false,
    from: null, count: 10, perDay: null, start: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const next = () => argv[++i];
    if (argv[i] === '--login') args.login = true;
    else if (argv[i] === '--check') args.check = true;
    else if (argv[i] === '--dry-run') args.dryRun = true;
    else if (argv[i] === '--headless') args.headless = true;
    else if (argv[i] === '--force') args.force = true;
    else if (argv[i] === '--from') args.from = Number(next());
    else if (argv[i] === '--count') args.count = Number(next());
    else if (argv[i] === '--per-day') args.perDay = Number(next());
    else if (argv[i] === '--start') args.start = next();
  }
  return args;
}

async function loadProgress() {
  if (!existsSync(PROGRESS_PATH)) return { scheduled: [] };
  return JSON.parse(await readFile(PROGRESS_PATH, 'utf8'));
}

async function saveProgress(progress) {
  await writeFile(PROGRESS_PATH, JSON.stringify(progress, null, 2) + '\n', 'utf8');
}

/** index 番目を、どの日時に予約するか。JST で扱う。 */
function slotDateTime(startDate, slots, offset) {
  const day = Math.floor(offset / slots.length);
  const [hour, minute] = slots[offset % slots.length].split(':').map(Number);
  const date = new Date(Date.parse(`${startDate}T00:00:00Z`) + day * MS_PER_DAY);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour,
    minute,
    label: `${date.toISOString().slice(0, 10)} ${slots[offset % slots.length]}`,
  };
}

/** 予約ダイアログの中にある日時プルダウンを、表示名から見分ける。 */
async function describeSelects(dialog) {
  return dialog.locator('select').evaluateAll((nodes) =>
    nodes.map((el, i) => ({
      index: i,
      id: el.id,
      label:
        el.getAttribute('aria-label') ||
        el.labels?.[0]?.textContent?.trim() ||
        el.closest('label')?.textContent?.trim() ||
        '',
      options: Array.from(el.options).slice(0, 3).map((o) => `${o.value}:${o.textContent.trim()}`),
      optionCount: el.options.length,
    })),
  );
}

function matchField(described, hints) {
  return described.find((s) => {
    const haystack = `${s.label} ${s.id}`.toLowerCase();
    return hints.some((h) => haystack.includes(h.toLowerCase()));
  });
}

/** value / label / 数値一致 の順に試して、プルダウンを合わせる。 */
async function setSelect(dialog, described, field, wanted) {
  const select = dialog.locator('select').nth(described.index);
  const attempts = [
    { value: String(wanted) },
    { label: String(wanted) },
    { label: `${wanted}月` },
    { label: `${wanted}日` },
    { label: `${wanted}年` },
    { label: String(wanted).padStart(2, '0') },
    { index: Number(wanted) },
  ];
  for (const attempt of attempts) {
    try {
      await select.selectOption(attempt, { timeout: 3000 });
      return;
    } catch {
      /* 次の書き方を試す */
    }
  }
  throw new Error(
    `予約日時の「${field}」に ${wanted} を設定できませんでした。\n` +
      `  見えているプルダウン: ${JSON.stringify(described)}\n` +
      `  scripts/x/lib/selectors.mjs の DATE_FIELD_HINTS を直してください。`,
  );
}

async function setSchedule(page, when) {
  await page.locator(SELECTORS.scheduleOpen).click({ timeout: 15_000 });

  const dialog = page.locator('[role="dialog"]').last();
  await dialog.locator('select').first().waitFor({ timeout: 15_000 });

  const described = await describeSelects(dialog);
  const field = (name) => {
    const found = matchField(described, DATE_FIELD_HINTS[name]);
    if (!found) {
      throw new Error(
        `予約ダイアログで「${name}」のプルダウンが見つかりません。\n` +
          `  見えているプルダウン: ${JSON.stringify(described)}\n` +
          `  scripts/x/lib/selectors.mjs の DATE_FIELD_HINTS を直してください。`,
      );
    }
    return found;
  };

  const ampmField = matchField(described, DATE_FIELD_HINTS.ampm);
  const hour12 = when.hour % 12 === 0 ? 12 : when.hour % 12;

  await setSelect(dialog, field('month'), 'month', when.month);
  await setSelect(dialog, field('day'), 'day', when.day);
  await setSelect(dialog, field('year'), 'year', when.year);
  await setSelect(dialog, field('hour'), 'hour', ampmField ? hour12 : when.hour);
  await setSelect(dialog, field('minute'), 'minute', String(when.minute).padStart(2, '0'));
  if (ampmField) {
    await setSelect(dialog, ampmField, 'ampm', when.hour < 12 ? '午前' : '午後');
  }

  await dialog.locator(SELECTORS.scheduleConfirm).click({ timeout: 10_000 });
}

async function scheduleOne(page, post, when, { dryRun }) {
  const text = renderPost(post);

  await page.goto(COMPOSE_URL, { waitUntil: 'domcontentloaded' });
  const editor = page.locator(SELECTORS.editor);
  await editor.waitFor({ timeout: 20_000 });
  await editor.click();
  await page.keyboard.insertText(text);

  // 入力が反映されたことを確かめてから次へ進む
  await page.waitForFunction(
    (selector) => (document.querySelector(selector)?.textContent ?? '').length > 20,
    SELECTORS.editor,
    { timeout: 10_000 },
  );

  await setSchedule(page, when);

  if (dryRun) {
    console.log('    --dry-run のため、確定は押しません。');
    return;
  }

  await page.locator(SELECTORS.postButton).first().click({ timeout: 10_000 });

  // 投稿画面が閉じたことをもって、登録できたと判断する
  try {
    await editor.waitFor({ state: 'detached', timeout: 20_000 });
  } catch {
    await page.screenshot({ path: `scripts/x/failed-${post.slug}.png` });
    throw new Error(
      '予約が登録されたことを確認できませんでした（投稿画面が閉じていません）。\n' +
        `  画面を scripts/x/failed-${post.slug}.png に保存しました。\n` +
        '  X の画面で予約一覧を確認してから、--from を調整して再開してください。',
    );
  }
}

const USAGE = `キューの投稿を、Chromium 上の X の予約投稿画面に登録する。

  npm run x:browser -- --login              最初に一度。開いた画面で手作業でログインする
  npm run x:browser -- --check              画面の要素が見つかるかを確認する（投稿しない）
  npm run x:browser -- --dry-run --count 1  入力まで行い、確定は押さない
  npm run x:browser -- --from 0 --count 10  実際に予約する

  --per-day N   1 日あたりの本数（既定はキューの設定）
  --start DATE  日付の起点（既定はキューの startDate）
  --headless    画面を出さずに動かす（普段は出したほうがよい）
  --force       登録済みの番号もやり直す
`;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(USAGE);
    return;
  }
  const queue = await loadQueue();
  const slots = args.perDay ? queue.slots.slice(0, args.perDay) : queue.slots;
  const startDate = args.start ?? queue.startDate;

  const { context, page } = await openBrowser({ headless: args.headless });

  try {
    if (args.login) {
      await page.goto('https://x.com/login', { waitUntil: 'domcontentloaded' });
      console.log('開いたウィンドウで X にログインしてください。');
      console.log('ログインが終わったら、このウィンドウを閉じてください。');
      await page.waitForSelector(SELECTORS.loggedIn, { timeout: 300_000 });
      console.log('ログインを確認しました。次からは自動で開きます。');
      return;
    }

    await requireLogin(page, SELECTORS.loggedIn);
    console.log('ログイン済みを確認しました。');

    if (args.check) {
      await page.goto(COMPOSE_URL, { waitUntil: 'domcontentloaded' });
      await page.locator(SELECTORS.editor).waitFor({ timeout: 20_000 });
      console.log('  editor: 見つかりました');
      await page.locator(SELECTORS.scheduleOpen).click({ timeout: 15_000 });
      console.log('  scheduleOpen: 見つかりました');
      const dialog = page.locator('[role="dialog"]').last();
      await dialog.locator('select').first().waitFor({ timeout: 15_000 });
      const described = await describeSelects(dialog);
      console.log('  予約ダイアログのプルダウン:');
      for (const s of described) {
        console.log(
          `    [${s.index}] id=${s.id || '(なし)'} label=${s.label || '(なし)'} ` +
            `選択肢${s.optionCount}件 例=${s.options.join(', ')}`,
        );
      }
      for (const name of Object.keys(DATE_FIELD_HINTS)) {
        const hit = matchField(described, DATE_FIELD_HINTS[name]);
        console.log(`    ${name}: ${hit ? `[${hit.index}] に対応` : '見つかりません'}`);
      }
      return;
    }

    const progress = await loadProgress();
    const done = new Set(progress.scheduled.map((s) => s.index));
    const from = args.from ?? (progress.scheduled.length ? Math.max(...done) + 1 : 0);
    const end = Math.min(from + args.count, queue.posts.length);

    console.log(`${from + 1} 〜 ${end} 本目を予約します（全 ${queue.posts.length} 本）。`);

    for (let i = from; i < end; i++) {
      if (done.has(i) && !args.force) {
        console.log(`  [${i + 1}] 登録済みのため飛ばします（--force で上書き）`);
        continue;
      }

      const post = queue.posts[i];
      const when = slotDateTime(startDate, slots, i);
      const length = weightedLength(renderPost(post));

      if (length > MAX_WEIGHTED) throw new Error(`[${i + 1}] 文字数超過（${length}）。中止します。`);
      if (Date.parse(`${when.label.slice(0, 10)}T${when.label.slice(11)}:00+09:00`) < Date.now()) {
        throw new Error(
          `[${i + 1}] 予約日時 ${when.label} が過去です。--start で起点をずらしてください。`,
        );
      }

      console.log(`  [${i + 1}] ${when.label}  ${post.slug}`);
      await scheduleOne(page, post, when, { dryRun: args.dryRun });

      if (!args.dryRun) {
        progress.scheduled.push({ index: i, slug: post.slug, at: when.label });
        await saveProgress(progress);
      }

      if (i < end - 1) await humanPause(8000, 20_000);
    }

    console.log(`\n完了しました。次回は --from ${end} から。`);
  } finally {
    await context.close();
  }
}

main().catch((err) => {
  console.error(`\n中止しました。\n${err.message}`);
  process.exit(1);
});
