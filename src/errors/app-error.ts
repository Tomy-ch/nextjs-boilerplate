import type { ErrorKind } from "./error-kind";

/**
 * 分類を cause chain に保持するアプリケーションエラーです。
 *
 * 表示用の code・message はこのクラスに持たせず、境界が `resolveErrorMeta` で解決します。
 */
export class AppError extends Error {
  /** このエラーに付与したプロトコル非依存の分類です。 */
  readonly kind: ErrorKind;

  /**
   * 分類と元エラーからアプリケーションエラーを構築します。
   *
   * @param kind エラー分類
   * @param options 原因エラーを保持するための Error options
   */
  constructor(kind: ErrorKind, options?: ErrorOptions) {
    super(kind, options);
    this.name = "AppError";
    this.kind = kind;
  }
}

/**
 * 元エラーを保ったまま、分類済みのアプリケーションエラーを生成します。
 *
 * @param kind エラー分類
 * @param options 原因エラーを保持するための Error options
 */
export function createAppError(kind: ErrorKind, options?: ErrorOptions): AppError {
  return new AppError(kind, options);
}

/**
 * cause chain から最初に見つかるアプリケーションエラーを返します。
 *
 * cause が循環している場合も走査を停止します。
 */
export function findAppError(error: unknown): AppError | undefined {
  const seen = new Set<Error>();
  let current = error;

  while (current instanceof Error && !seen.has(current)) {
    if (current instanceof AppError) {
      return current;
    }

    seen.add(current);
    current = current.cause;
  }

  return undefined;
}

/** cause chain にアプリケーションエラー分類が含まれるかを返します。 */
export function isAppError(error: unknown): boolean {
  return findAppError(error) !== undefined;
}
