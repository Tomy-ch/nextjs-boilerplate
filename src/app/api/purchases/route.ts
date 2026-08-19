import { getMyPurchases, parsePurchaseHistoryQuery } from "@/adapters/server/api/purchases";
import { toHttpStatus } from "@/adapters/server/http/error-status";
import { toRawQuery } from "@/adapters/server/http/search-params";
import { findAppError } from "@/errors/app-error";
import { getDefaultErrorMeta } from "@/errors/error-catalog";
import { ErrorKind } from "@/errors/error-kind";

/** 分類から、返す status と文言を組む。分類の付いていない失敗は internal へ矯正する。 */
function toErrorResponse(error: unknown): Response {
  const kind = findAppError(error)?.kind ?? ErrorKind.INTERNAL;

  return Response.json(
    { message: getDefaultErrorMeta(kind).message },
    { status: toHttpStatus(kind) },
  );
}

/**
 * 購入履歴の増分取得。
 *
 * @remarks
 * 無限スクロールが 2 ページ目以降を取りに来る口です。初回ページは Server Component が直接
 * 取得するため、ここは通りません（[0073](../../../../docs/adr/0073-pagination-fetch-boundary.md)）。
 *
 * この口が要るのは、0073 が client の増分取得を **same-origin への薄い fetch** に限っている
 * ためです。client からバックエンドを直接叩くと、資格情報の載せ方と timeout・再試行が
 * `adapters/server` の外にもう 1 系統できます。
 *
 * 取得も検証も `adapters/server` が済ませています。このハンドラが持つのは、済んだ分類を
 * HTTP へ写すところだけです（[0025](../../../../docs/adr/0025-app-layer-elements.md)）。
 *
 * 認証は購入の取得そのものが要求します。ここで先に弾かないのは、判定を 2 か所に置くと
 * 片方だけが緩む余地が残るためで、資格情報が無い要求は `adapters` が `unauthenticated` として
 * 返し、それがそのまま 401 になります。
 */
export async function GET(request: Request): Promise<Response> {
  const parsed = parsePurchaseHistoryQuery(toRawQuery(new URL(request.url).searchParams));

  if (!parsed.ok) {
    return Response.json(
      { message: getDefaultErrorMeta(ErrorKind.INVALID_ARGUMENT).message },
      { status: toHttpStatus(ErrorKind.INVALID_ARGUMENT) },
    );
  }

  try {
    return Response.json(await getMyPurchases(parsed.query));
  } catch (error) {
    return toErrorResponse(error);
  }
}
