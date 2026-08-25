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

/** 描画を span に載せる範囲の値型です。 */
export type RenderSpanScope = "none" | "screen" | "part";

/** 描画を span に載せる範囲の値です。 */
export const RenderSpanScope: Readonly<Record<Uppercase<RenderSpanScope>, RenderSpanScope>> = {
  NONE: "none",
  SCREEN: "screen",
  PART: "part",
};

const renderSpans = z
  .enum([RenderSpanScope.NONE, RenderSpanScope.SCREEN, RenderSpanScope.PART])
  .default(RenderSpanScope.SCREEN);

/** OTLP exporter の endpoint を検証する。 */
export function otlpEndpointValidator() {
  return httpUrl;
}

/** signal 別 exporter の有効化値を検証する。空文字列と none は無効として扱う。 */
export function otlpExporterValidator() {
  return exporter;
}

/**
 * 描画を span に載せる範囲を検証する。
 *
 * @remarks
 * 既定を `screen` にするのは、画面 1 つあたり 2 span で済み、外向きの通信を画面へ結び付けるという
 * 目的がその範囲で満たされるためです。`part` は 1 描画の span が描く部品の数だけ増えるので、
 * 分岐した結果を読みたいときに開けます。
 */
export function renderSpansValidator() {
  return renderSpans;
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
  OBS_RENDER_SPANS: z.infer<ReturnType<typeof renderSpansValidator>>;
};
