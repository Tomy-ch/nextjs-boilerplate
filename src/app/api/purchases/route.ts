import { getMyPurchases, parsePurchaseHistoryQuery } from "@/adapters/server/api/purchases";
import { toCaughtErrorResponse, toErrorResponse } from "@/adapters/server/http/error-response";
import { toRawQuery } from "@/adapters/server/http/search-params";
import { ErrorKind } from "@/errors/error-kind";

/**
 * 購入履歴の増分取得。
 *
 * @remarks
 * 増分取得の境界（初回ページは Server Component、2 ページ目以降がこの口）と、取得も検証も
 * `adapters/server` が済ませこのハンドラは分類を HTTP へ写すだけである点は、一覧の増分取得
 * （`../products/route.ts`）と同じです。
 *
 * この口が要るのは、0073 が client の増分取得を **same-origin への薄い fetch** に限っている
 * ためです。client からバックエンドを直接叩くと、資格情報の載せ方と timeout・再試行が
 * `adapters/server` の外にもう 1 系統できます。
 *
 * 認証は購入の取得そのものが要求します。ここで先に弾かないのは、判定を 2 か所に置くと
 * 片方だけが緩む余地が残るためで、資格情報が無い要求は `adapters` が `unauthenticated` として
 * 返し、それがそのまま 401 になります。
 */
export async function GET(request: Request): Promise<Response> {
  const parsed = parsePurchaseHistoryQuery(toRawQuery(new URL(request.url).searchParams));

  if (!parsed.ok) {
    return toErrorResponse(ErrorKind.INVALID_ARGUMENT);
  }

  try {
    return Response.json(await getMyPurchases(parsed.query));
  } catch (error) {
    return toCaughtErrorResponse(error);
  }
}
