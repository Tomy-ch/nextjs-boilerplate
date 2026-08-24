import { describe, expect, it, vi } from "vitest";

import { PARSED_ENVIRONMENT } from "@/config/environment.fixture";

import { serveJson } from "../../../../vitest.setup.msw";

const { getAccessToken, getEnvironment, signOut } = vi.hoisted(() => ({
  getAccessToken: vi.fn(async (): Promise<string | null> => "access-token"),
  getEnvironment: vi.fn(() => PARSED_ENVIRONMENT),
  signOut: vi.fn(async (): Promise<void> => undefined),
}));

vi.mock("@/config/environment", () => ({ getEnvironment }));
vi.mock("../auth/session", () => ({ getAccessToken, signOut }));

import { getDashboardSummary, parseDashboardQuery } from "./dashboard";

const SUMMARY_URL = `${PARSED_ENVIRONMENT.APP_API_BASE_URL}/v1/dashboard/summary`;

const wireSummary = {
  salesAmount: 123_456,
  salesCount: 1234,
  purchaseStatusCounts: [
    { status: { id: "0f4b2f2e-6a3f-4c4a-9e6e-2b1d8f2a1b11", name: "検討中" }, count: 22 },
    { status: { id: "0f4b2f2e-6a3f-4c4a-9e6e-2b1d8f2a1b12", name: "支払い済み" }, count: 5 },
  ],
  totalProductCount: 476,
  publishedProductCount: 454,
};

describe("parseDashboardQuery", () => {
  // ----- 正常系 -----
  it("契約に載る条件をそのまま取得条件へ写す", () => {
    expect(parseDashboardQuery({ period: "range", from: "2026-08-01", to: "2026-08-19" })).toEqual({
      ok: true,
      query: { period: "range", from: "2026-08-01", to: "2026-08-19" },
    });
  });

  it("period が無ければ契約の既定値が入る", () => {
    const result = parseDashboardQuery({});

    expect(result.ok && result.query.period).toBe("today");
  });

  it("range のときに日付が揃っているかは見ない", () => {
    expect(parseDashboardQuery({ period: "range", from: "2026-08-01" }).ok).toBe(true);
  });

  it("終了日が開始日より前でも、書式が合えば通す", () => {
    expect(parseDashboardQuery({ period: "range", from: "2026-08-19", to: "2026-08-01" }).ok).toBe(
      true,
    );
  });

  // ----- 異常系 -----
  it("契約に無い区分は読めないキーとして返す", () => {
    expect(parseDashboardQuery({ period: "weekly" })).toEqual({
      ok: false,
      invalidKeys: ["period"],
    });
  });

  it("日付の書式が違えばそのキーを返す", () => {
    const result = parseDashboardQuery({ period: "range", from: "2026/08/01", to: "2026-08-19" });

    expect(result).toEqual({ ok: false, invalidKeys: ["from"] });
  });

  it("複数のキーが壊れていれば、そのすべてを返す", () => {
    const result = parseDashboardQuery({ period: "weekly", from: "きのう" });

    expect(result.ok === false && [...result.invalidKeys].sort()).toEqual(["from", "period"]);
  });

  it("同じキーに指摘が重なっても 1 度しか返さない", () => {
    const result = parseDashboardQuery({ period: ["weekly", "monthly"] });

    expect(result.ok === false && result.invalidKeys).toEqual(["period"]);
  });

  it("検証ライブラリの型ではなく素のキー名で返す", () => {
    const result = parseDashboardQuery({ period: "weekly" });

    expect(result.ok === false && typeof result.invalidKeys[0]).toBe("string");
  });
});

describe("getDashboardSummary", () => {
  // ----- 正常系 -----
  it("取得した資格情報を Authorization に載せる", async () => {
    const requests = serveJson(SUMMARY_URL, wireSummary);

    await getDashboardSummary({ period: "today", from: "2026-05-05" });

    expect(requests[0]?.headers.get("authorization")).toBe("Bearer access-token");
  });

  it("契約の応答を表示用の集計にして返す", async () => {
    serveJson(SUMMARY_URL, wireSummary);

    const summary = await getDashboardSummary({ period: "month" });

    expect(summary.salesAmount).toBe(123_456);
    expect(summary.salesCount).toBe(1234);
    expect(summary.totalProductCount).toBe(476);
    expect(summary.publishedProductCount).toBe(454);
  });

  it("ステータスの id と名称を平らにして返す", async () => {
    serveJson(SUMMARY_URL, wireSummary);

    const summary = await getDashboardSummary({ period: "range", from: "2026-01-01" });

    expect(summary.purchaseStatusCounts[0]).toEqual({
      statusId: "0f4b2f2e-6a3f-4c4a-9e6e-2b1d8f2a1b11",
      statusName: "検討中",
      count: 22,
    });
  });

  it("契約が返した順序をそのまま保つ", async () => {
    serveJson(SUMMARY_URL, wireSummary);

    const summary = await getDashboardSummary({ period: "range", to: "2026-12-31" });

    expect(summary.purchaseStatusCounts.map((entry) => entry.statusName)).toEqual([
      "検討中",
      "支払い済み",
    ]);
  });

  it("期間の語彙を契約の値へ写してクエリに載せる", async () => {
    const requests = serveJson(SUMMARY_URL, wireSummary);

    await getDashboardSummary({ period: "today" });

    expect(requests[0]?.url).toBe(`${SUMMARY_URL}?period=today`);
  });

  it("range では両端の日付も載せる", async () => {
    const requests = serveJson(SUMMARY_URL, wireSummary);

    await getDashboardSummary({ period: "range", from: "2026-08-01", to: "2026-08-19" });

    expect(requests[0]?.url).toBe(`${SUMMARY_URL}?period=range&from=2026-08-01&to=2026-08-19`);
  });

  it("期間を省略すればクエリに載せない", async () => {
    const requests = serveJson(SUMMARY_URL, wireSummary);

    await getDashboardSummary();

    expect(requests[0]?.url).toBe(SUMMARY_URL);
  });

  it("内訳が空の期間でも空のまま返す", async () => {
    serveJson(SUMMARY_URL, { ...wireSummary, purchaseStatusCounts: [] });

    const summary = await getDashboardSummary({ period: "month", from: "2026-02-01" });

    expect(summary.purchaseStatusCounts).toEqual([]);
  });
});
