// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import type { DashboardSummary } from "@/model/dashboard/dashboard";

const { getDashboardSummary } = vi.hoisted(() => ({ getDashboardSummary: vi.fn() }));

vi.mock("@/adapters/server/api/dashboard", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/adapters/server/api/dashboard")>()),
  getDashboardSummary,
}));

import { AdminDashboardPageContent } from "./page-content";

const SUMMARY: DashboardSummary = {
  salesAmount: 123_456,
  salesCount: 1234,
  purchaseStatusCounts: [{ statusId: "1", statusName: "検討中", count: 22 }],
  totalProductCount: 476,
  publishedProductCount: 454,
};

beforeEach(() => {
  vi.clearAllMocks();
  getDashboardSummary.mockResolvedValue(SUMMARY);
});

// 店のタイムゾーンでは日付が変わった直後、協定世界時ではまだ前日という瞬時。
const AFTER_MIDNIGHT_IN_TOKYO = new Date("2026-08-24T15:30:00.000Z");

describe("AdminDashboardPageContent", () => {
  it("店のタイムゾーンで見た今日 1 日を、区間の両端を挙げて求める", async () => {
    render(await AdminDashboardPageContent({ now: AFTER_MIDNIGHT_IN_TOKYO }));

    expect(getDashboardSummary).toHaveBeenCalledWith({
      after: "2026-08-25T00:00:00+09:00",
      before: "2026-08-26T00:00:00+09:00",
    });
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(await AdminDashboardPageContent({ now: AFTER_MIDNIGHT_IN_TOKYO }));

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });

  it("取得した集計を数値カードと内訳にする", async () => {
    render(await AdminDashboardPageContent({ now: AFTER_MIDNIGHT_IN_TOKYO }));

    expect(screen.getByRole("region", { name: "今日の集計" })).toBeInTheDocument();
    expect(screen.getByText("$1,234.56")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ステータス別の件数" })).toBeInTheDocument();
  });
});
