// X の画面要素の指定。UI が変わったら壊れるので、直す場所をここ 1 か所に集めてある。
// `npm run x:browser -- --check` で、いまの画面に対して全部当たるかを確認できる。

export const SELECTORS = {
  // ログイン済みかどうかの判定に使う（サイドバーの投稿ボタン）
  loggedIn: '[data-testid="SideNav_NewTweet_Button"]',

  // 投稿画面
  editor: '[data-testid="tweetTextarea_0"]',

  // 予約ダイアログを開くボタン（投稿画面の下部）
  scheduleOpen: '[data-testid="scheduleOption"]',

  // 予約ダイアログ内の「確認」ボタン
  scheduleConfirm: '[data-testid="scheduledConfirmationPrimaryAction"]',

  // 予約を確定する投稿ボタン。画面によって testid が 2 種類ある
  postButton: '[data-testid="tweetButton"], [data-testid="tweetButtonInline"]',
};

// 予約ダイアログの日時プルダウンを見分けるための語。
// 表示言語によって変わるので、日本語と英語の両方を入れてある。
export const DATE_FIELD_HINTS = {
  month: ['月', 'month'],
  day: ['日', 'day'],
  year: ['年', 'year'],
  hour: ['時', 'hour'],
  minute: ['分', 'minute'],
  ampm: ['午前', '午後', 'am', 'pm'],
};
