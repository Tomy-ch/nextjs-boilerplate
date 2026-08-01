import { describe, expect, it } from "vitest";

import { OtelExporter, otlpEndpointValidator, otlpExporterValidator } from "./observability.schema";

describe("observability schema", () => {
  it("http と https の OTLP endpoint を受け入れる", () => {
    expect(otlpEndpointValidator().safeParse("http://otel.example.test/v1/traces").success).toBe(
      true,
    );
    expect(otlpEndpointValidator().safeParse("https://otel.example.test/v1/traces").success).toBe(
      true,
    );
  });

  it("http(s) 以外の OTLP endpoint を拒否する", () => {
    expect(otlpEndpointValidator().safeParse("ftp://otel.example.test/v1/traces").success).toBe(
      false,
    );
  });

  it("signal exporter は未指定時に none を補う", () => {
    expect(otlpExporterValidator().parse(undefined)).toBe(OtelExporter.NONE);
  });

  it("OTLP と無効化値だけを受け入れる", () => {
    expect(otlpExporterValidator().safeParse(OtelExporter.OTLP).success).toBe(true);
    expect(otlpExporterValidator().safeParse(OtelExporter.NONE).success).toBe(true);
    expect(otlpExporterValidator().safeParse(OtelExporter.DISABLED).success).toBe(true);
    expect(otlpExporterValidator().safeParse("console").success).toBe(false);
  });
});
