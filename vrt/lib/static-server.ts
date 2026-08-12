// build 済みの Storybook を配る静的サーバ。
//
// 依存を持たないのは、これを動かすのが VRT のコンテナだから。コンテナには repo の
// `node_modules` を持ち込まず、Playwright の実行に要るものだけを置いている。
//
// `file://` で直接開けないのは、Storybook の entry が module script であり、ブラウザが
// `file://` 由来の module を origin なしとして拒むため。
import { createReadStream, statSync } from "node:fs";
import { createServer, type Server } from "node:http";
import path from "node:path";

const NOT_FOUND = 404;

const CONTENT_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
  [".woff2", "font/woff2"],
]);

/** 拡張子に対応する Content-Type。対応表に無い拡張子はバイト列として返す。 */
export function contentType(file: string): string {
  return CONTENT_TYPES.get(path.extname(file).toLowerCase()) ?? "application/octet-stream";
}

/**
 * URL を配信ディレクトリ内の絶対パスへ解決する。範囲外を指す URL と、URL を持たない要求は
 * null を返す。
 *
 * @remarks
 * 上位ディレクトリの指定は URL の正規化が畳むため、`..` はここへ届く時点で配信ディレクトリ内へ
 * 収まっています。それでも解決結果が配信ディレクトリの下にあることを確かめるのは、この関数が
 * 受け取る文字列の出所を URL の解析結果だけに縛らないためです。
 */
export function resolveFilePath(root: string, url: string | undefined): string | null {
  if (url === undefined) return null;
  const pathname = decodeURIComponent(new URL(url, "http://localhost").pathname);
  const resolved = path.resolve(root, `.${pathname}`);
  const prefix = `${path.resolve(root)}${path.sep}`;
  if (!resolved.startsWith(prefix)) return null;

  return resolved;
}

/** 配信ディレクトリを根として静的ファイルを返すサーバを作る。 */
export function createStaticServer(root: string): Server {
  return createServer((request, response) => {
    const file = resolveFilePath(root, request.url);
    if (file === null || !isFile(file)) {
      response.writeHead(NOT_FOUND).end();

      return;
    }
    response.writeHead(200, { "content-type": contentType(file) });
    createReadStream(file).pipe(response);
  });
}

function isFile(file: string): boolean {
  try {
    return statSync(file).isFile();
  } catch {
    return false;
  }
}
