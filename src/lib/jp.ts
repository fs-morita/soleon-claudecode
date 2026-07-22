// src/lib/jp.ts
// 日本語を文節単位で自然に折り返すためのユーティリティ（BudouX）。
// ビルド時に <wbr>（改行可能位置）を差し込むので、クライアントJSは不要。
//
// 事前に:  npm i budoux
//
// 使い方（.astro 側）:
//   import { jp } from '../lib/jp';
//   <h2 set:html={jp('現場の作業手順書づくりや外国人材向けの多言語化に手間がかかっていませんか。')} />
//
// jp() は word-break:keep-all を持つ span で包まれた HTML を返すので、
// keep-all によって「<wbr> の位置でしか折り返さない」＝自然な文節区切りになる。

import { loadDefaultJapaneseParser } from 'budoux';

const parser = loadDefaultJapaneseParser();

/** 日本語テキスト（HTML可）を、自然な折り返し位置つきのHTML文字列に変換する */
export function jp(text: string): string {
  return parser.translateHTMLString(text);
}
