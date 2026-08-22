import { z } from "zod";

/** observability purpose 専用の ENV validator を定義する。 */

/** signal exporter の有効化値型です。 */
export type OtelExporter = "otlp" | "none" | "";

/** signal exporter の有効化値です。 */
export const OtelExporter: Readonly<Record<"OTLP" | "NONE" | "DISABLED", OtelExporter>> = {
  OTLP: "otlp",
  NONE: "none",
  DISABLED: "",
};

const httpUrl = z.url().refine(
  (value) => {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  },
  { error: "http または https の URL を指定してください" },
);

const exporter = z
  .enum([OtelExporter.OTLP, OtelExporter.NONE])
  .or(z.literal(OtelExporter.DISABLED))
  .default(OtelExporter.NONE);

/** OTLP exporter の endpoint を検証する。 */
export function otlpEndpointValidator() {
  return httpUrl;
}

/** signal 別 exporter の有効化値を検証する。空文字列と none は無効として扱う。 */
export function otlpExporterValidator() {
  return exporter;
}

/** テレメトリの発信元を表す service 名を検証する。 */
export function serviceNameValidator() {
  return z.string().min(1);
}

export type ObservabilityEnvironment = {
  OBS_SERVICE_NAME: z.infer<ReturnType<typeof serviceNameValidator>>;
  OTEL_EXPORTER_OTLP_ENDPOINT: z.infer<ReturnType<typeof otlpEndpointValidator>>;
  OBS_TRACES_EXPORTER: z.infer<ReturnType<typeof otlpExporterValidator>>;
  OBS_METRICS_EXPORTER: z.infer<ReturnType<typeof otlpExporterValidator>>;
  OBS_LOGS_EXPORTER: z.infer<ReturnType<typeof otlpExporterValidator>>;
};
