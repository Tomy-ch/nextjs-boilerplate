/**
 * errors カーネルが扱う、プロトコルに依存しないエラー分類です。
 *
 * この値は transport の変換前後で共通に用いるため、分類の追加は ADR の更新を伴います。
 */
export const errorKinds = [
  "invalid-argument",
  "unauthenticated",
  "permission-denied",
  "not-found",
  "conflict",
  "validation",
  "too-many-requests",
  "unavailable",
  "unimplemented",
  "internal",
] as const;

/** errors カーネルが受け入れるエラー分類です。 */
export type ErrorKind = (typeof errorKinds)[number];
