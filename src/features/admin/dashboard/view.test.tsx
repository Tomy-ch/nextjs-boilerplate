// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import type { DashboardSummary } from "@/model/dashboard/dashboard";

import { DashboardView } from "./view";

beforeAll(() => {
  // 内訳に併置する図が寸法を測るために使う API を jsdom が持たないため、ここで補う。
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  // 図は近づいてから読む（`ui/status-chart/`）。その判断に使う API も jsdom には無い。
  // **交差を知らせない stub で足りる。** ここが確かめるのは図の周りであって、図が届いた後の
  // 姿は `ui/status-chart/` のテストが持つ。
  globalThis.IntersectionObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
    readonly root = null;
    readonly rootMargin = "";
    readonly scrollMargin = "";
    readonly thresholds = [];
  };
});

const SUMMARY: DashboardSummary = {
  salesAmount: 123_456,
  salesCount: 1234,
  purchaseStatusCounts: [{ statusId: "1", statusName: "検討中", count: 22 }],
  totalProductCount: 476,
  publishedProductCount: 454,
};

describe("DashboardView", () => {
  it("集計を数値カードと内訳にして並べる", () => {
    render(<DashboardView summary={SUMMARY} />);

    expect(screen.getByRole("region", { name: "今日の集計" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ステータス別の件数" })).toBeInTheDocument();
  });

  it("期間別の集計への導線を置く", () => {
    render(<DashboardView summary={SUMMARY} />);

    expect(screen.getByRole("link", { name: "期間別の集計を見る" })).toHaveAttribute(
      "href",
      "/admin/analytics",
    );
  });

  it("この画面では期間を選ばせない", () => {
    render(<DashboardView summary={SUMMARY} />);

    expect(screen.queryByRole("navigation", { name: "集計対象期間" })).not.toBeInTheDocument();
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(<DashboardView summary={SUMMARY} />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
