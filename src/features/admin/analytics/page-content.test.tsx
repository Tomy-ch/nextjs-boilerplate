// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

const { summaryMounted, rankingMounted } = vi.hoisted(() => ({
  summaryMounted: vi.fn(),
  rankingMounted: vi.fn(),
}));

vi.mock("./summary-section", () => ({
  AnalyticsSummarySection: () => {
    useEffect(() => summaryMounted(), []);

    return <p>集計の区画</p>;
  },
}));
vi.mock("./ranking-section", () => ({
  AnalyticsRankingSection: () => {
    useEffect(() => rankingMounted(), []);

    return <p>売れ筋の区画</p>;
  },
}));

import { AdminAnalyticsPageContent, type RawSearchParams } from "./page-content";

function renderContent(searchParams: RawSearchParams) {
  return render(<AdminAnalyticsPageContent searchParams={searchParams} />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AdminAnalyticsPageContent", () => {
  // ----- 契約に照らして読めない期間のとき -----
  it("集計の代わりにその旨を出す", () => {
    renderContent({ period: "weekly" });

    expect(screen.getByText("この期間では集計を表示できません")).toBeInTheDocument();
    expect(screen.queryByText("集計の区画")).not.toBeInTheDocument();
  });

  it("読めないキーを画面上の呼び名で示す", () => {
    renderContent({ period: "weekly" });

    expect(screen.getByText(/期間の区分/)).toBeInTheDocument();
  });

  it("日付のキーが読めなければ、その欄の呼び名で示す", () => {
    renderContent({ period: "range", from: "2026/08/01", to: "2026-08-19" });

    expect(screen.getByText(/開始日/)).toBeInTheDocument();
  });

  it("終了日が読めなければ、終了日の呼び名で示す", () => {
    renderContent({ period: "range", from: "2026-08-01", to: "きのう" });

    expect(screen.getByText(/終了日/)).toBeInTheDocument();
  });

  it("期間を外して見る導線を置く", () => {
    renderContent({ period: "weekly" });

    expect(screen.getByRole("link", { name: "期間を外して見る" })).toHaveAttribute(
      "href",
      "/admin/analytics",
    );
  });

  it("読めない形でも a11y 検査を通る", async () => {
    const { container } = renderContent({ period: "weekly" });

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });

  // ----- 読める期間のとき -----
  it("選択肢と 2 つの区画を組む", () => {
    renderContent({});

    expect(screen.getByRole("navigation", { name: "集計対象期間" })).toBeInTheDocument();
    expect(screen.getByText("集計の区画")).toBeInTheDocument();
    expect(screen.getByText("売れ筋の区画")).toBeInTheDocument();
  });

  it("値の無いキーを落として契約へ通す", () => {
    renderContent({ period: undefined, from: undefined });

    expect(screen.getByText("集計の区画")).toBeInTheDocument();
  });

  it("対象の暦日を選択肢の下に添える", () => {
    renderContent({ period: "range", from: "2026-08-01", to: "2026-08-19" });

    expect(screen.getByText("2026-08-01 〜 2026-08-19")).toBeInTheDocument();
  });

  it("前後が入れ替わった期間では、集計中の暦日を添えない", () => {
    renderContent({ period: "range", from: "2026-08-20", to: "2026-08-01" });

    expect(screen.getByText("集計する期間が決まっていません。")).toBeInTheDocument();
    expect(screen.queryByText(/2026-08-20 〜 2026-08-01/)).not.toBeInTheDocument();
  });

  it("期間が変われば集計の待機が作り直される", () => {
    const { rerender } = renderContent({ period: "today" });

    expect(summaryMounted).toHaveBeenCalledTimes(1);

    rerender(<AdminAnalyticsPageContent searchParams={{ period: "month" }} />);

    expect(summaryMounted).toHaveBeenCalledTimes(2);
  });

  it("売れ筋は期間が変わっても作り直されない", () => {
    const { rerender } = renderContent({ period: "today" });

    rerender(<AdminAnalyticsPageContent searchParams={{ period: "month" }} />);

    expect(rankingMounted).toHaveBeenCalledTimes(1);
  });

  it("同じ期間を描き直しても作り直さない", () => {
    const { rerender } = renderContent({ period: "today" });

    rerender(<AdminAnalyticsPageContent searchParams={{ period: "today" }} />);

    expect(summaryMounted).toHaveBeenCalledTimes(1);
  });

  it("組み上がった形でも a11y 検査を通る", async () => {
    const { container } = renderContent({});

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
