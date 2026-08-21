import { describe, expect, it, vi } from "vitest";

import { PARSED_ENVIRONMENT } from "@/config/environment.fixture";
import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { serveJson, serveStatus } from "../../../../vitest.setup";

const { getAccessToken, getEnvironment, warn } = vi.hoisted(() => ({
  getAccessToken: vi.fn(async (): Promise<string | null> => "access-token"),
  getEnvironment: vi.fn(() => PARSED_ENVIRONMENT),
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

const EXCHANGE_RATES_URL = `${PARSED_ENVIRONMENT.APP_API_BASE_URL}/v1/exchange-rates`;

describe("convertToReferenceAmount", () => {
  // ----- 正常系 -----
  it("契約の参考換算額を表示用の 4 項目へ写す", async () => {
    serveJson(EXCHANGE_RATES_URL, wire);

    expect(await convertToReferenceAmount(18_897)).toEqual({
      currency: "JPY",
      amount: 28_346,
      rate: "150.00",
      rateDate: "2026-08-17",
    });
  });

  it("最小単位の整数を、契約が受け取る decimal 文字列にして送る", async () => {
    const requests = serveJson(EXCHANGE_RATES_URL, wire);

    await convertToReferenceAmount(18_897);

    const url = new URL(String(requests[0]?.url));

    expect(url.searchParams.get("original")).toBe("188.97");
    expect(url.searchParams.get("base")).toBe("USD");
    expect(url.searchParams.get("displayCurrency")).toBe("JPY");
  });

  // ----- 異常系 -----
  it("換算できなかった応答では null を返す", async () => {
    serveJson(EXCHANGE_RATES_URL, { ...wire, referenceAmount: null });

    expect(await convertToReferenceAmount(18_897)).toBeNull();
  });

  it("通信の失敗は握り潰さず投げる", async () => {
    serveStatus("get", EXCHANGE_RATES_URL, 503);

    await expect(convertToReferenceAmount(18_897)).rejects.toSatisfy(
      (error: unknown) => findAppError(error)?.kind === ErrorKind.UNAVAILABLE,
    );
  });
});

describe("readReferenceAmount", () => {
  // ----- 正常系 -----
  it("引けた参考換算額をそのまま返す", async () => {
    serveJson(EXCHANGE_RATES_URL, wire);

    expect(await readReferenceAmount(18_897)).toEqual({
      currency: "JPY",
      amount: 28_346,
      rate: "150.00",
      rateDate: "2026-08-17",
    });
  });

  it("換算できなかった応答をそのまま伝える", async () => {
    serveJson(EXCHANGE_RATES_URL, { ...wire, referenceAmount: null });

    expect(await readReferenceAmount(18_897)).toBeNull();
  });

  // ----- 異常系 -----
  it("取得に失敗しても投げず、読めなかったことを null で表す", async () => {
    serveStatus("get", EXCHANGE_RATES_URL, 503);

    expect(await readReferenceAmount(18_897)).toBeNull();
  });

  it("読めなかったことを記録に残す", async () => {
    warn.mockClear();
    serveStatus("get", EXCHANGE_RATES_URL, 503);

    await readReferenceAmount(18_897);

    expect(warn).toHaveBeenCalledWith("参考換算額を読めませんでした", expect.anything());
  });
});
