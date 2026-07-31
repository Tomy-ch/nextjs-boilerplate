import { z } from "zod";

/** observability purpose 専用の ENV validator を定義する。 */

const httpUrl = z.url().refine(
  (value) => {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  },
  { error: "http または https の URL を指定してください" },
);

/** OTLP exporter の endpoint を検証する。 */
export function otlpEndpointValidator() {
  return httpUrl;
}

export type ObservabilityEnvironment = {
  OTEL_EXPORTER_OTLP_ENDPOINT: z.infer<ReturnType<typeof otlpEndpointValidator>>;
};
