import { findAppError } from "./app-error";
import type { ErrorKind } from "./error-kind";
import { createErrorMeta, type ErrorMeta, errorMetaFrom } from "./error-meta";

const defaultErrorMeta: Readonly<Record<ErrorKind, ErrorMeta>> = {
  "invalid-argument": createErrorMeta({
    code: "BAD_REQUEST",
    message: "入力内容が正しくありません。",
  }),
  unauthenticated: createErrorMeta({
    code: "UNAUTHENTICATED",
    message: "認証が必要です。",
  }),
  "permission-denied": createErrorMeta({
    code: "FORBIDDEN",
    message: "この操作を実行する権限がありません。",
  }),
  "not-found": createErrorMeta({
    code: "NOT_FOUND",
    message: "対象が見つかりません。",
  }),
  conflict: createErrorMeta({
    code: "RESOURCE_CONFLICT",
    message: "現在の状態ではこの操作を実行できません。",
  }),
  validation: createErrorMeta({
    code: "VALIDATION_FAILED",
    message: "入力内容を確認してください。",
  }),
  "too-many-requests": createErrorMeta({
    code: "TOO_MANY_REQUESTS",
    message: "しばらく時間をおいてから再試行してください。",
  }),
  unavailable: createErrorMeta({
    code: "SERVICE_UNAVAILABLE",
    message: "現在サービスを利用できません。しばらくしてから再試行してください。",
  }),
  unimplemented: createErrorMeta({
    code: "NOT_IMPLEMENTED",
    message: "この機能は利用できません。",
  }),
  internal: createErrorMeta({
    code: "INTERNAL",
    message: "問題が発生しました。時間をおいて再試行してください。",
  }),
};

/** 指定した分類の既定メタ情報を返します。 */
export function getDefaultErrorMeta(kind: ErrorKind): ErrorMeta {
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
