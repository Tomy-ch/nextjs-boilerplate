import { findAddressCandidates } from "@/adapters/server/api/addresses";
import { toHttpStatus } from "@/adapters/server/http/error-status";
import { findAppError } from "@/errors/app-error";
import { getDefaultErrorMeta } from "@/errors/error-catalog";
import { ErrorKind } from "@/errors/error-kind";

/** 契約が受け付ける郵便番号の形。ここを通らない要求はバックエンドへ出さない。 */
const POSTAL_CODE_PATTERN = /^[0-9]{3}-[0-9]{4}$/;

/** 分類から、返す status と文言を組む。分類の付いていない失敗は internal へ矯正する。 */
function toErrorResponse(error: unknown): Response {
  const kind = findAppError(error)?.kind ?? ErrorKind.INTERNAL;

  return Response.json(
    { message: getDefaultErrorMeta(kind).message },
    { status: toHttpStatus(kind) },
  );
}

/**
 * 郵便番号からの住所補完。
 *
 * @remarks
 * 入力中の画面が叩く口です。ブラウザから外部オリジンへ直接出さないための中継であり、取得も
 * 検証も `adapters/server` が済ませています（[0071](../../../../docs/adr/0071-bff-api-integration.md)）。
 *
 * 形を先に見てから中継します。契約の pattern を外れた値はどのみち `400` で返るので、往復を
 * 1 つ減らせます。
 *
 * 外部の lookup が落ちている場合も `200` と空の候補が返ります。契約がそう定めており、画面は
 * 手入力を続けられます。
 */
export async function GET(request: Request): Promise<Response> {
  const postalCode = new URL(request.url).searchParams.get("postalCode") ?? "";

  if (!POSTAL_CODE_PATTERN.test(postalCode)) {
    return Response.json(
      { message: getDefaultErrorMeta(ErrorKind.INVALID_ARGUMENT).message },
      { status: toHttpStatus(ErrorKind.INVALID_ARGUMENT) },
    );
  }

  try {
    return Response.json({ candidates: await findAddressCandidates(postalCode) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
