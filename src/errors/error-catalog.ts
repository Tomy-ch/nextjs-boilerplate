import { findAppError } from "./app-error";
import { ErrorKind, type ErrorKind as ErrorKindType } from "./error-kind";
import { createErrorMeta, type ErrorMeta, errorMetaFrom } from "./error-meta";

const defaultErrorMeta: Readonly<Record<ErrorKindType, ErrorMeta>> = {
  [ErrorKind.INVALID_ARGUMENT]: createErrorMeta({
    code: "BAD_REQUEST",
    message: "入力内容が正しくありません。",
  }),
  [ErrorKind.UNAUTHENTICATED]: createErrorMeta({
    code: "UNAUTHENTICATED",
    message: "認証が必要です。",
  }),
  [ErrorKind.PERMISSION_DENIED]: createErrorMeta({
    code: "FORBIDDEN",
    message: "この操作を実行する権限がありません。",
  }),
  [ErrorKind.NOT_FOUND]: createErrorMeta({
    code: "NOT_FOUND",
    message: "対象が見つかりません。",
  }),
  [ErrorKind.CONFLICT]: createErrorMeta({
    code: "RESOURCE_CONFLICT",
    message: "現在の状態ではこの操作を実行できません。",
  }),
  [ErrorKind.VALIDATION]: createErrorMeta({
    code: "VALIDATION_FAILED",
    message: "入力内容を確認してください。",
  }),
  [ErrorKind.UNSUPPORTED_MEDIA_TYPE]: createErrorMeta({
    code: "UNSUPPORTED_MEDIA_TYPE",
    message: "この形式のデータは受け付けられません。",
  }),
  [ErrorKind.PAYLOAD_TOO_LARGE]: createErrorMeta({
    code: "PAYLOAD_TOO_LARGE",
    message: "送信するデータのサイズが大きすぎます。",
  }),
  [ErrorKind.TOO_MANY_REQUESTS]: createErrorMeta({
    code: "TOO_MANY_REQUESTS",
    message: "しばらく時間をおいてから再試行してください。",
  }),
  [ErrorKind.CANCELED]: createErrorMeta({
    code: "CANCELED",
    message: "リクエストが中断されました。",
  }),
  [ErrorKind.UNAVAILABLE]: createErrorMeta({
    code: "SERVICE_UNAVAILABLE",
    message: "現在サービスを利用できません。しばらくしてから再試行してください。",
  }),
  [ErrorKind.UNIMPLEMENTED]: createErrorMeta({
    code: "NOT_IMPLEMENTED",
    message: "この機能は利用できません。",
  }),
  [ErrorKind.INTERNAL]: createErrorMeta({
    code: "INTERNAL",
    message: "問題が発生しました。時間をおいて再試行してください。",
  }),
};

/** 指定した分類の既定メタ情報を返します。 */
export function getDefaultErrorMeta(kind: ErrorKindType): ErrorMeta {
  return defaultErrorMeta[kind];
}

/**
 * cause chain の分類と、最も外側のメタ情報から表示用メタ情報を解決します。
 *
 * 分類がないエラーは境界で `internal` へ正規化するため、ここでは解決しません。
 */
export function resolveErrorMeta(error: unknown): ErrorMeta | undefined {
  const appError = findAppError(error);
  if (appError === undefined) {
    return undefined;
  }

  const fallback = getDefaultErrorMeta(appError.kind);
  const override = errorMetaFrom(error);

  if (override === undefined) {
    return fallback;
  }

  return createErrorMeta({
    code: override.code || fallback.code,
    message: override.message || fallback.message,
    requestId: override.requestId,
    details: override.details,
  });
}
