import { describe, expect, it } from "vitest";

import { otlpEndpointValidator } from "./observability.schema";

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
});
