// X API v2 への OAuth 1.0a (user context) 署名。外部依存なし。
import { createHmac, randomBytes } from 'node:crypto';

// RFC3986 準拠のパーセントエンコード。encodeURIComponent が残す 4 文字も変換する。
const enc = (s) =>
  encodeURIComponent(String(s)).replace(
    /[!'()*]/g,
    (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase(),
  );

/**
 * Authorization ヘッダを組み立てる。
 * body が JSON の場合、署名対象は oauth_* パラメータのみ（フォーム値は含めない）。
 */
export function authHeader({ method, url, credentials, nowSeconds, nonce }) {
  const oauth = {
    oauth_consumer_key: credentials.apiKey,
    oauth_nonce: nonce ?? randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(nowSeconds ?? Math.floor(Date.now() / 1000)),
    oauth_token: credentials.accessToken,
    oauth_version: '1.0',
  };

  const paramString = Object.keys(oauth)
    .sort()
    .map((k) => `${enc(k)}=${enc(oauth[k])}`)
    .join('&');

  const baseString = [method.toUpperCase(), enc(url), enc(paramString)].join('&');
  const signingKey = `${enc(credentials.apiSecret)}&${enc(credentials.accessSecret)}`;
  const signature = createHmac('sha1', signingKey).update(baseString).digest('base64');

  const header = { ...oauth, oauth_signature: signature };
  return (
    'OAuth ' +
    Object.keys(header)
      .sort()
      .map((k) => `${enc(k)}="${enc(header[k])}"`)
      .join(', ')
  );
}

/** 環境変数から資格情報を読む。1 つでも欠けていれば null。 */
export function credentialsFromEnv(env = process.env) {
  const c = {
    apiKey: env.X_API_KEY,
    apiSecret: env.X_API_SECRET,
    accessToken: env.X_ACCESS_TOKEN,
    accessSecret: env.X_ACCESS_SECRET,
  };
  return Object.values(c).every(Boolean) ? c : null;
}
