import { z } from "zod";

/** media purpose 専用の ENV validator を定義する。 */

const httpUrl = z.url().refine(
  (value) => {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  },
  { error: "http または https の URL を指定してください" },
);

/** media 配信 origin を検証する。 */
export function mediaOriginValidator() {
  return httpUrl;
}

export type MediaEnvironment = {
  MEDIA_ORIGIN: z.infer<ReturnType<typeof mediaOriginValidator>>;
};
