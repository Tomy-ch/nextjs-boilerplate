import { afterEach, describe, expect, it, vi } from "vitest";

import type { Environment } from "@/config/environment";
import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";

const environment: Environment = {
  APP_API_BASE_URL: "https://api.example.test",
  APP_API_MODE: "mock",
  MEDIA_ORIGIN: "https://media.example.test",
  OTEL_EXPORTER_OTLP_ENDPOINT: "https://otel.example.test/v1/traces",
  OBS_TRACES_EXPORTER: "none",
  OBS_METRICS_EXPORTER: "none",
  OBS_LOGS_EXPORTER: "none",
  AUTH_ISSUER: "https://id.example.test",
  AUTH_CLIENT_ID: "nextjs-boilerplate",
  AUTH_REDIRECT_URI: "https://app.example.test/auth/callback",
  AUTH_SCOPES: "openid profile",
  AUTH_SESSION_SECRET: "01234567890123456789012345678901",
  NEXT_PUBLIC_HTTP_MAX_URL_BYTES: 8000,
};

const { getAccessToken, getEnvironment, warn } = vi.hoisted(() => ({
  getAccessToken: vi.fn(async (): Promise<string | null> => "access-token"),
  getEnvironment: vi.fn(() => environment),
  warn: vi.fn(),
}));

vi.mock("@/config/environment", () => ({ getEnvironment }));
vi.mock("../auth/session", () => ({ getAccessToken }));
vi.mock("@/logging/logging.server", () => ({
  getLogger: () => ({ warn }),
  reportQuietly: (run: () => void) => run(),
}));

import { convertToReferenceAmount, readReferenceAmount } from "./exchange-rates";

const wire = {
  base: "USD",
  quote: "JPY",
  original: "188.97",
  converted: "28345.50",
  referenceAmount: {
    currency: "JPY",
    amount: 28_346,
    rate: "150.00",
    rateDate: "2026-08-17",
  },
};

function stubFetch(body: unknown): ReturnType<typeof vi.fn> {
  const fetchImpl = vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }));

  vi.stubGlobal("fetch", fetchImpl);

  return fetchImpl;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("convertToReferenceAmount", () => {
  // ----- 正常系 -----
  it("契約の参考換算額を表示用の 4 項目へ写す", async () => {
    stubFetch(wire);

    expect(await convertToReferenceAmount(18_897)).toEqual({
      currency: "JPY",
      amount: 28_346,
      rate: "150.00",
      rateDate: "2026-08-17",
    });
  });

  it("最小単位の整数を、契約が受け取る decimal 文字列にして送る", async () => {
    const fetchImpl = stubFetch(wire);

    await convertToReferenceAmount(18_897);

    const url = new URL(String(fetchImpl.mock.calls[0]?.[0]));

    expect(url.searchParams.get("original")).toBe("188.97");
    expect(url.searchParams.get("base")).toBe("USD");
    expect(url.searchParams.get("displayCurrency")).toBe("JPY");
  });

  // ----- 異常系 -----
  it("換算できなかった応答では null を返す", async () => {
    stubFetch({ ...wire, referenceAmount: null });

    expect(await convertToReferenceAmount(18_897)).toBeNull();
  });

  it("通信の失敗は握り潰さず投げる", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 503 })),
    );

    await expect(convertToReferenceAmount(18_897)).rejects.toSatisfy(
      (error: unknown) => findAppError(error)?.kind === ErrorKind.UNAVAILABLE,
    );
  });
});

describe("readReferenceAmount", () => {
  // ----- 正常系 -----
  it("引けた参考換算額をそのまま返す", async () => {
    stubFetch(wire);

    expect(await readReferenceAmount(18_897)).toEqual({
      currency: "JPY",
      amount: 28_346,
      rate: "150.00",
      rateDate: "2026-08-17",
    });
  });

  it("換算できなかった応答をそのまま伝える", async () => {
    stubFetch({ ...wire, referenceAmount: null });

    expect(await readReferenceAmount(18_897)).toBeNull();
  });

  // ----- 異常系 -----
  it("取得に失敗しても投げず、読めなかったことを null で表す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 503 })),
    );

    expect(await readReferenceAmount(18_897)).toBeNull();
  });

  it("読めなかったことを記録に残す", async () => {
    warn.mockClear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 503 })),
    );

    await readReferenceAmount(18_897);

    expect(warn).toHaveBeenCalledWith("参考換算額を読めませんでした", expect.anything());
  });
});
