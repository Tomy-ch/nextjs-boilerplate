import { findAddresses } from "@/adapters/server/api/addresses";
import { toCaughtErrorResponse, toErrorResponse } from "@/adapters/server/http/error-response";
import { ErrorKind } from "@/errors/error-kind";

/** 契約が受け付ける郵便番号の形。ここを通らない要求はバックエンドへ出さない。 */
const POSTAL_CODE_PATTERN = /^\d{3}-\d{4}$/;

/**
 * 郵便番号からの住所補完。
 *
 * @remarks
 * 外部の lookup が落ちている場合も `200` と空の候補が返ります。契約がそう定めており、画面は
 * 手入力を続けられます。**そのとき `isFallback` が true になる**ので、該当なしと言い分けたい
 * 画面のためにそのまま渡します。
 */
export async function GET(request: Request): Promise<Response> {
  const postalCode = new URL(request.url).searchParams.get("postalCode") ?? "";

  if (!POSTAL_CODE_PATTERN.test(postalCode)) {
    return toErrorResponse(ErrorKind.INVALID_ARGUMENT);
  }

  try {
    return Response.json(await findAddresses(postalCode));
  } catch (error) {
    return toCaughtErrorResponse(error);
  }
}
