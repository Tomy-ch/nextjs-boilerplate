import { describe, expect, it, vi } from "vitest";

import { PARSED_ENVIRONMENT } from "@/config/environment.fixture";

import { serveJson } from "../../../../vitest.setup";

const { getAccessToken, getEnvironment, signOut } = vi.hoisted(() => ({
  getAccessToken: vi.fn(async (): Promise<string | null> => "access-token"),
  getEnvironment: vi.fn(() => PARSED_ENVIRONMENT),
  signOut: vi.fn(async (): Promise<void> => undefined),
}));

vi.mock("@/config/environment", () => ({ getEnvironment }));
vi.mock("../auth/session", () => ({ getAccessToken, signOut }));

import { getDashboardSummary } from "./dashboard";

/** 2026 年 8 月 1 か月ぶんの区間。 */
const MONTH_WINDOW = {
  after: "2026-08-01T00:00:00+09:00",
  before: "2026-09-01T00:00:00+09:00",
};

const SUMMARY_URL = `${PARSED_ENVIRONMENT.APP_API_BASE_URL}/v1/dashboard/summary`;

const wireSummary = {
  salesAmount: 123_456,
  salesCount: 1234,
  purchaseStatusCounts: [
    { status: { id: "0f4b2f2e-6a3f-4c4a-9e6e-2b1d8f2a1b11", code: 3, name: "確認中" }, count: 22 },
    {
      status: { id: "0f4b2f2e-6a3f-4c4a-9e6e-2b1d8f2a1b12", code: 7, name: "支払い済み" },
      count: 5,
    },
  ],
  totalProductCount: 476,
  publishedProductCount: 454,
};

describe("getDashboardSummary", () => {
  // ----- 正常系 -----
  it("取得した資格情報を Authorization に載せる", async () => {
    const requests = serveJson(SUMMARY_URL, wireSummary);

    await getDashboardSummary(MONTH_WINDOW);

    expect(requests[0]?.headers.get("authorization")).toBe("Bearer access-token");
  });

  it("契約の応答を表示用の集計にして返す", async () => {
    serveJson(SUMMARY_URL, wireSummary);

    const summary = await getDashboardSummary(MONTH_WINDOW);

    expect(summary.salesAmount).toBe(123_456);
    expect(summary.salesCount).toBe(1234);
    expect(summary.totalProductCount).toBe(476);
    expect(summary.publishedProductCount).toBe(454);
  });

  it("ステータスの id と名称を平らにして返す", async () => {
    serveJson(SUMMARY_URL, wireSummary);

    const summary = await getDashboardSummary(MONTH_WINDOW);

    expect(summary.purchaseStatusCounts[0]).toEqual({
      statusId: "0f4b2f2e-6a3f-4c4a-9e6e-2b1d8f2a1b11",
      statusName: "確認中",
      count: 22,
    });
  });

  it("契約が返した順序をそのまま保つ", async () => {
    serveJson(SUMMARY_URL, wireSummary);

    const summary = await getDashboardSummary(MONTH_WINDOW);

    expect(summary.purchaseStatusCounts.map((entry) => entry.statusName)).toEqual([
      "確認中",
      "支払い済み",
    ]);
  });

  it("区間の両端をオフセット付きのままクエリに載せる", async () => {
    const requests = serveJson(SUMMARY_URL, wireSummary);

    await getDashboardSummary(MONTH_WINDOW);

    const query = new URL(requests[0]?.url ?? "").searchParams;

    expect(query.get("orderedAfter")).toBe(MONTH_WINDOW.after);
    expect(query.get("orderedBefore")).toBe(MONTH_WINDOW.before);
  });

  it("片側だけの区間では、その側だけを載せる", async () => {
    const requests = serveJson(SUMMARY_URL, wireSummary);

    await getDashboardSummary({ after: MONTH_WINDOW.after });

    const query = new URL(requests[0]?.url ?? "").searchParams;

    expect(query.get("orderedAfter")).toBe(MONTH_WINDOW.after);
    expect(query.get("orderedBefore")).toBeNull();
  });

  it("区間を省略すればクエリに載せない", async () => {
    const requests = serveJson(SUMMARY_URL, wireSummary);

    await getDashboardSummary();

    expect(requests[0]?.url).toBe(SUMMARY_URL);
  });

  it("内訳が空の期間でも空のまま返す", async () => {
    serveJson(SUMMARY_URL, { ...wireSummary, purchaseStatusCounts: [] });

    const summary = await getDashboardSummary(MONTH_WINDOW);

    expect(summary.purchaseStatusCounts).toEqual([]);
  });
});
