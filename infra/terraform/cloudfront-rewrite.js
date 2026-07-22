// CloudFront Function (viewer-request)
// Astro のディレクトリ形式出力（/blog/index.html 等）を S3(OAC) 経由で正しく配信するため、
// ディレクトリ的なURLに index.html を補う。
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html';
  } else if (uri.lastIndexOf('.') < uri.lastIndexOf('/')) {
    // 末尾セグメントに拡張子が無い（= ディレクトリ想定）→ /index.html を付与
    request.uri = uri + '/index.html';
  }

  return request;
}
