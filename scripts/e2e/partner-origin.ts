import { createServer, type Server } from "node:http";

/**
 * 宣言した別 origin として返す文書。
 *
 * @remarks
 * 中身は要りません。ブラウザが「この origin の文書から fetch した」と扱うことだけが目的で、
 * script も style も持たせないのは、そこで起きた失敗が spec の主題（CORS）と混ざらないためです。
 */
export const PARTNER_DOCUMENT = "<!doctype html><title>partner</title>";

/**
 * 別 origin の文書だけを返すサーバを立てる。
 *
 * @remarks
 * `page.route` で文書を偽装すると、Chromium はその文書を公開ネットワーク由来と扱い、
 * コンテナから見たホスト（プライベート IP）への fetch を Private Network Access で止めます。
 * 実在のサーバをアプリと同じホストの別ポートに置けば private → private になり、3 つの
 * 描画エンジンで同じ判定に乗ります。
 *
 * @param hostname - 待ち受けるアドレス。アプリと同じもの（`.makefiles/testing/e2e.mk`）
 * @param port - 待ち受けるポート
 * @returns 止める関数。既に止まっていれば拒む
 */
export function servePartnerOrigin(hostname: string, port: number): Promise<() => Promise<void>> {
  return new Promise((resolve, reject) => {
    const server = createServer((_request, response) => {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(PARTNER_DOCUMENT);
    });

    server.once("error", reject);
    server.listen(port, hostname, () => resolve(() => closeServer(server)));
  });
}

/** 待ち受けをやめる。既に止まっていれば拒む。 */
function closeServer(server: Server): Promise<void> {
  return new Promise((done, fail) => {
    server.close((error) => (error ? fail(error) : done()));
  });
}
