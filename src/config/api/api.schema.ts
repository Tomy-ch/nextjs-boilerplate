import { z } from "zod";

/** API purpose 専用の ENV validator を定義する。 */

const httpUrl = z.url().refine(
  (value) => {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  },
  { error: "http または https の URL を指定してください" },
);

/** API の接続先 URL を検証する。 */
export function apiBaseUrlValidator() {
  return httpUrl;
}

/** API 接続モードを検証する。 */
export function apiModeValidator() {
  return z.enum(["live", "mock"]);
}

export type ApiEnvironment = {
  APP_API_BASE_URL: z.infer<ReturnType<typeof apiBaseUrlValidator>>;
  APP_API_MODE: z.infer<ReturnType<typeof apiModeValidator>>;
};
