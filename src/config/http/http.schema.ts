import { z } from "zod";

/** http purpose 専用の ENV validator を定義する。 */

const maxUrlBytes = z.coerce.number().int().positive();

/** 1 つの要求 URL に許すバイト数の上限を検証する。 */
export function maxUrlBytesValidator() {
  return maxUrlBytes;
}

const maxUploadBytes = z.coerce.number().int().positive();

/** 中継する 1 件のアップロードに許すバイト数の上限を検証する。 */
export function maxUploadBytesValidator() {
  return maxUploadBytes;
}

/** `Origin` ヘッダと完全一致で比べられる形（scheme + host + port、パス無し）か。 */
function isOrigin(value: string): boolean {
  try {
    return new URL(value).origin === value;
  } catch {
    return false;
  }
}

const allowedOrigins = z
  .string()
  .default("")
  .transform((value) =>
    value
      .split(",")
      .map((origin) => origin.trim())
      .filter((origin) => origin !== ""),
  )
  .refine((origins) => origins.every(isOrigin), {
    error: "http または https の origin（パス無し）をカンマ区切りで指定してください",
  });

/**
 * BFF を別 origin から呼ばせる相手を検証する。
 *
 * @remarks
 * 省略できます。既定の空は「同一 origin だけ」で、これは配備に依らず正しい値です。
 */
export function allowedOriginsValidator() {
  return allowedOrigins;
}

export type HttpEnvironment = {
  NEXT_PUBLIC_HTTP_MAX_URL_BYTES: z.infer<ReturnType<typeof maxUrlBytesValidator>>;
  NEXT_PUBLIC_HTTP_MAX_UPLOAD_BYTES: z.infer<ReturnType<typeof maxUploadBytesValidator>>;
  HTTP_ALLOWED_ORIGINS: z.infer<ReturnType<typeof allowedOriginsValidator>>;
};
