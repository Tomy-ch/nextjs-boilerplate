// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { DashboardSummary } from "@/model/dashboard/dashboard";

beforeAll(() => {
  // 内訳に併置する図が寸法を測るために使う API を jsdom が持たないため、ここで補う。
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

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

describe("AdminDashboardPageContent", () => {
  it("今日を明示して集計を求める", async () => {
    render(await AdminDashboardPageContent());

    expect(getDashboardSummary).toHaveBeenCalledWith({ period: "today" });
  });

  it("取得した集計を数値カードと内訳にする", async () => {
    render(await AdminDashboardPageContent());

    expect(screen.getByRole("region", { name: "今日の集計" })).toBeInTheDocument();
    expect(screen.getByText("$1,234.56")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ステータス別の件数" })).toBeInTheDocument();
  });
});
