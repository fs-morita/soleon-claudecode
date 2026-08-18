// 投稿キューのどの 1 本を今流すかを、日付から決める。
// 実行結果をどこにも保存しないので、状態ファイルも commit も要らない。
// 走らなかった枠はその 1 本を飛ばすだけで、次の枠は正しい位置から続く。

const MS_PER_DAY = 86_400_000;
const JST_OFFSET_MS = 9 * 3_600_000;

/** UTC の Date から JST での暦日（YYYY-MM-DD）を得る。 */
export function jstDate(now = new Date()) {
  return new Date(now.getTime() + JST_OFFSET_MS).toISOString().slice(0, 10);
}

/** JST での「今の時刻」を HH:MM で得る。 */
export function jstTime(now = new Date()) {
  return new Date(now.getTime() + JST_OFFSET_MS).toISOString().slice(11, 16);
}

function daysBetween(fromDate, toDate) {
  const a = Date.parse(`${fromDate}T00:00:00Z`);
  const b = Date.parse(`${toDate}T00:00:00Z`);
  return Math.round((b - a) / MS_PER_DAY);
}

/**
 * 実行時刻に最も近い投稿枠を選ぶ。
 * GitHub Actions の cron は数分〜十数分ずれるため、時刻の一致ではなく最近傍で判定する。
 */
export function nearestSlot(slots, timeHHMM) {
  const toMinutes = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const target = toMinutes(timeHHMM);
  let best = 0;
  let bestDistance = Infinity;
  slots.forEach((slot, i) => {
    const d = Math.abs(toMinutes(slot) - target);
    if (d < bestDistance) {
      bestDistance = d;
      best = i;
    }
  });
  return best;
}

/**
 * 今この瞬間に投稿すべきキュー内の位置を返す。
 * startDate の 1 枠目を 0 として、1 日あたり slots.length 本ずつ進む。
 */
export function resolveIndex({ startDate, slots }, now = new Date()) {
  const day = daysBetween(startDate, jstDate(now));
  const slot = nearestSlot(slots, jstTime(now));
  return day * slots.length + slot;
}

/** index 番目の投稿が流れる JST 日時を、人が読める形で返す。 */
export function describeIndex({ startDate, slots }, index) {
  const day = Math.floor(index / slots.length);
  const slot = index % slots.length;
  const date = new Date(Date.parse(`${startDate}T00:00:00Z`) + day * MS_PER_DAY)
    .toISOString()
    .slice(0, 10);
  return `${date} ${slots[slot]}`;
}
