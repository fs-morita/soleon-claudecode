// X API の従量課金（Pay Per Use）の単価。
// 2026-02-06 に新規開発者向けの無料枠が廃止され、従量課金が既定になった。
// 単価は変わりうるので、実際の請求と食い違ったらここを直す。
export const RATE_USD = {
  textOnly: 0.015,
  withUrl: 0.2,
};

/** この仕組みは記事 URL を必ず付けるので、1 件あたりは withUrl。 */
export function costOf(post) {
  return post.link === false ? RATE_USD.textOnly : RATE_USD.withUrl;
}

export function summarize(posts, slotsPerDay) {
  const total = posts.reduce((sum, p) => sum + costOf(p), 0);
  const perDay = (total / posts.length) * slotsPerDay;
  return {
    total,
    perDay,
    perMonth: perDay * 30,
    days: Math.ceil(posts.length / slotsPerDay),
  };
}

export const usd = (n) => `$${n.toFixed(2)}`;
/** 目安の円換算。為替は動くので、桁感をつかむためだけのもの。 */
export const jpy = (n) => `約${Math.round((n * 150) / 100) * 100}円`;
