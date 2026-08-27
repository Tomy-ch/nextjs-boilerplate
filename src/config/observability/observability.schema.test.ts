import { describe, expect, it } from "vitest";

import {
  OtelExporter,
  otlpEndpointValidator,
  otlpExporterValidator,
  RenderSpanScope,
  renderSpansValidator,
  serviceNameValidator,
} from "./observability.schema";

describe("otlpEndpointValidator", () => {
  // ----- 正常系 -----
  it("http と https の OTLP endpoint を受け入れる", () => {
    expect(otlpEndpointValidator().safeParse("http://otel.example.test/v1/traces").success).toBe(
      true,
    );
    expect(otlpEndpointValidator().safeParse("https://otel.example.test/v1/traces").success).toBe(
      true,
    );
  });

  // ----- 異常系 -----
  it("http(s) 以外の OTLP endpoint を拒否する", () => {
    expect(otlpEndpointValidator().safeParse("ftp://otel.example.test/v1/traces").success).toBe(
      false,
    );
  });
});

describe("otlpExporterValidator", () => {
  // ----- 正常系 -----
  it("signal exporter は未指定時に none を補う", () => {
    expect(otlpExporterValidator().parse(undefined)).toBe(OtelExporter.NONE);
  });

  it("OTLP と無効化値を受け入れる", () => {
    expect(otlpExporterValidator().safeParse(OtelExporter.OTLP).success).toBe(true);
    expect(otlpExporterValidator().safeParse(OtelExporter.NONE).success).toBe(true);
    expect(otlpExporterValidator().safeParse(OtelExporter.DISABLED).success).toBe(true);
  });

  // ----- 異常系 -----
  it("OTLP と無効化値のどちらでもない exporter を拒否する", () => {
    expect(otlpExporterValidator().safeParse("console").success).toBe(false);
  });
});

describe("renderSpansValidator", () => {
  // ----- 正常系 -----
  it("未指定なら画面の最上位だけを載せる範囲を補う", () => {
    expect(renderSpansValidator().parse(undefined)).toBe(RenderSpanScope.SCREEN);
  });

  it("none と screen と part を受け入れる", () => {
    expect(renderSpansValidator().safeParse(RenderSpanScope.NONE).success).toBe(true);
    expect(renderSpansValidator().safeParse(RenderSpanScope.SCREEN).success).toBe(true);
    expect(renderSpansValidator().safeParse(RenderSpanScope.PART).success).toBe(true);
  });

  // ----- 異常系 -----
  it("range を表さない値を拒否する", () => {
    expect(renderSpansValidator().safeParse("all").success).toBe(false);
  });
});

describe("serviceNameValidator", () => {
  // ----- 正常系 -----
  it("service 名を受け入れる", () => {
    expect(serviceNameValidator().safeParse("Boilerplate Web").success).toBe(true);
  });

  // ----- 異常系 -----
  it("空の service 名を拒否する", () => {
    expect(serviceNameValidator().safeParse("").success).toBe(false);
  });
});
