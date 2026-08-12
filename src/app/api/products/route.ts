import { getProductListPage, parseProductQuery } from "@/adapters/server/api/products";
import { getDefaultErrorMeta } from "@/errors/error-catalog";
import { ErrorKind } from "@/errors/error-kind";

/**
 * 一覧の増分取得。
 *
 * @remarks
 * 無限スクロールが 2 ページ目以降を取りに来る口です。初回ページは Server Component が直接
 * 取得するため、ここは通りません（[0073](../../../../docs/adr/0073-pagination-fetch-boundary.md)）。
 *
 * 中継しかしません。取得も検証も画像 URL の解決も `adapters/server` が済ませており、この
 * ハンドラが持つのは「検証を通らなかったことを HTTP で伝える」ところだけです
 * （[0025](../../../../docs/adr/0025-app-layer-elements.md)）。
 *
 * 取得そのものの失敗は捕まえません。分類とログは `adapters` の境界が済ませており、ここで
 * 捕まえ直すとログが二重になります（[0080](../../../../docs/adr/0080-error-handling.md)）。
 * 呼び出し側は応答が返らなかったことだけを見て、失敗として扱います。
 */
export async function GET(request: Request): Promise<Response> {
  const raw = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = parseProductQuery(raw);

  if (!parsed.ok) {
    return Response.json(
      { message: getDefaultErrorMeta(ErrorKind.INVALID_ARGUMENT).message },
      { status: 400 },
    );
  }

  return Response.json(await getProductListPage(parsed.query));
}
