import { getProductListPage, parseProductQuery } from "@/adapters/server/api/products";
import { findAppError } from "@/errors/app-error";
import { getDefaultErrorMeta } from "@/errors/error-catalog";
import { ErrorKind, type ErrorKind as ErrorKindType } from "@/errors/error-kind";

/**
 * 分類ごとの HTTP status。
 *
 * @remarks
 * 対応は [0080](../../../../docs/adr/0080-error-handling.md) §1 の表が正です。`errors` は
 * transport を知らない層なので、分類から status への変換はこの境界が持ちます。
 */
const STATUS_BY_KIND: Readonly<Record<ErrorKindType, number>> = {
  [ErrorKind.INVALID_ARGUMENT]: 400,
  [ErrorKind.UNAUTHENTICATED]: 401,
  [ErrorKind.PERMISSION_DENIED]: 403,
  [ErrorKind.NOT_FOUND]: 404,
  [ErrorKind.CONFLICT]: 409,
  [ErrorKind.VALIDATION]: 422,
  [ErrorKind.UNSUPPORTED_MEDIA_TYPE]: 415,
  [ErrorKind.PAYLOAD_TOO_LARGE]: 413,
  [ErrorKind.TOO_MANY_REQUESTS]: 429,
  [ErrorKind.CANCELED]: 499,
  [ErrorKind.UNAVAILABLE]: 503,
  [ErrorKind.UNIMPLEMENTED]: 501,
  [ErrorKind.INTERNAL]: 500,
};

/** 分類から、返す status と文言を組む。分類の付いていない失敗は internal へ矯正する。 */
function toErrorResponse(error: unknown): Response {
  const kind = findAppError(error)?.kind ?? ErrorKind.INTERNAL;

  return Response.json(
    { message: getDefaultErrorMeta(kind).message },
    { status: STATUS_BY_KIND[kind] },
  );
}

/**
 * 一覧の増分取得。
 *
 * @remarks
 * 無限スクロールが 2 ページ目以降を取りに来る口です。初回ページは Server Component が直接
 * 取得するため、ここは通りません（[0073](../../../../docs/adr/0073-pagination-fetch-boundary.md)）。
 *
 * 取得も検証も画像 URL の解決も `adapters/server` が済ませています。このハンドラが持つのは、
 * 済んだ分類を HTTP へ写すところだけです（[0025](../../../../docs/adr/0025-app-layer-elements.md)）。
 *
 * 失敗を捕まえるのは、握り潰すためではなく**正規化した形で返す**ためです。投げたままにすると
 * 応答の中身が framework の既定になり、内側の事情がそのまま外へ出ます
 * （[0080](../../../../docs/adr/0080-error-handling.md)）。分類とログは `adapters` の境界が
 * 済ませているので、ここでは記録し直しません。
 */
export async function GET(request: Request): Promise<Response> {
  const raw = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = parseProductQuery(raw);

  if (!parsed.ok) {
    return Response.json(
      { message: getDefaultErrorMeta(ErrorKind.INVALID_ARGUMENT).message },
      { status: STATUS_BY_KIND[ErrorKind.INVALID_ARGUMENT] },
    );
  }

  try {
    return Response.json(await getProductListPage(parsed.query));
  } catch (error) {
    return toErrorResponse(error);
  }
}
