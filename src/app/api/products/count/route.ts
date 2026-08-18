import { getProductCount, parseProductQuery } from "@/adapters/server/api/products";
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
 * 絞り込みを確定する前の件数。
 *
 * @remarks
 * 脇の絞り込みが、まだ URL に載っていない条件で何件になるかを問い合わせる口です。確定した条件
 * ぶんは Server Component が取得するため、ここは通りません。
 *
 * 一覧の増分取得と同じ組み立てです。持つのは、済んだ分類を HTTP へ写すところだけで、取得も
 * 検証も `adapters/server` が済ませています（[0025](../../../../../docs/adr/0025-app-layer-elements.md)）。
 */
export async function GET(request: Request): Promise<Response> {
  const parsed = parseProductQuery(toRawQuery(new URL(request.url).searchParams));

  if (!parsed.ok) {
    return Response.json(
      { message: getDefaultErrorMeta(ErrorKind.INVALID_ARGUMENT).message },
      { status: toHttpStatus(ErrorKind.INVALID_ARGUMENT) },
    );
  }

  try {
    return Response.json({ count: await getProductCount(parsed.query) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
