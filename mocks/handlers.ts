// sample:replace-begin
import type { RequestHandler } from "msw";

import { getGoBoilerplateAPIMock } from "./api/endpoints.msw";

/**
 * パスが持つパラメータ区間の数。
 *
 * @remarks
 * 少ないほど具体的なパスです。`/v1/products/ranking` は 0、`/v1/products/:productId` は 1 で、
 * 前者は後者にも一致します。
 */
function parameterCount(handler: RequestHandler): number {
  const path = "path" in handler.info ? handler.info.path : "";

  return typeof path === "string" ? (path.match(/:/g) ?? []).length : 0;
}
// sample:replace-with
// sample:replace-end

/**
 * 契約から生成した MSW ハンドラ一式。
 *
 * @remarks
 * ハンドラを手書きしません。契約が変われば生成物が変わり、モックも一緒に動きます。手で足すと、
 * 契約とモックが別々に動き始め、モックが通るのに実際の API では通らない状態を作れてしまいます。
 *
 * 並べ替えるのは、MSW が登録順に照合するためです。生成物の順序は契約のパス順であり、
 * `/v1/products/:productId` が `/v1/products/ranking` より前に来ると、後者への要求が前者に
 * 食われて商品 1 件の応答が返ります。具体的なパスを先に置くことで、パラメータ区間は
 * 他に一致するものが無かったときだけ拾います。並べ替えは安定なので、同じ具体度どうしの
 * 順序は生成物のままです。
 *
 * mock が差し替えるのは API だけです。画像は配信元（`MEDIA_ORIGIN`）から実物を取得します。
 */
// sample:replace-begin
export const handlers = [...getGoBoilerplateAPIMock()].sort(
  (left, right) => parameterCount(left) - parameterCount(right),
);
// sample:replace-with
// = export const handlers: never[] = [];
// sample:replace-end
