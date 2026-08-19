import { z } from "zod";

/** http purpose 専用の ENV validator を定義する。 */

const maxUrlBytes = z.coerce.number().int().positive();

/** 1 つの要求 URL に許すバイト数の上限を検証する。 */
export function maxUrlBytesValidator() {
  return maxUrlBytes;
}

export type HttpEnvironment = {
  NEXT_PUBLIC_HTTP_MAX_URL_BYTES: z.infer<ReturnType<typeof maxUrlBytesValidator>>;
};
