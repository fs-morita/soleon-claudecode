// X の文字数カウント（twitter-text の weighted length 準拠）。
// 日本語などの全角は 2、ASCII 等は 1 として数え、上限は 280。
// URL は実際の長さに関わらず t.co の 23 文字に短縮される。

const MAX_WEIGHTED = 280;
const URL_WEIGHTED = 23;
const DEFAULT_WEIGHT = 2;

// weight 1 で数える Unicode 範囲（ラテン、記号の一部）。それ以外は 2。
const LIGHT_RANGES = [
  [0x0000, 0x10ff],
  [0x2000, 0x200d],
  [0x2010, 0x201f],
  [0x2032, 0x2037],
];

const URL_RE = /https?:\/\/\S+/g;

function charWeight(codePoint) {
  for (const [lo, hi] of LIGHT_RANGES) {
    if (codePoint >= lo && codePoint <= hi) return 1;
  }
  return DEFAULT_WEIGHT;
}

/** 投稿本文の重み付き文字数を返す（URL は 23 換算）。 */
export function weightedLength(text) {
  const urls = text.match(URL_RE) ?? [];
  const withoutUrls = text.replace(URL_RE, '');

  let total = urls.length * URL_WEIGHTED;
  for (const ch of withoutUrls) {
    total += charWeight(ch.codePointAt(0));
  }
  return total;
}

export function isWithinLimit(text) {
  return weightedLength(text) <= MAX_WEIGHTED;
}

export { MAX_WEIGHTED, URL_WEIGHTED };
