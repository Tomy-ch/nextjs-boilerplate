// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { DASHBOARD_PERIOD, type DashboardSummaryQuery } from "@/model/dashboard/dashboard";

import { AnalyticsView } from "./view";

function renderView(query: DashboardSummaryQuery, window?: { from: string; to: string }) {
  return render(
    <AnalyticsView
      query={query}
      ranking={<p>売れ筋の区画</p>}
      summary={<p>集計の区画</p>}
      window={window}
    />,
  );
}

describe("AnalyticsView", () => {
  it("選択肢と対象の暦日を、待つ区画の外に置く", () => {
    renderView({ period: DASHBOARD_PERIOD.TODAY }, { from: "2026-08-19", to: "2026-08-19" });

    expect(screen.getByRole("navigation", { name: "集計対象期間" })).toBeInTheDocument();
    expect(screen.getByText(/2026-08-19/)).toBeInTheDocument();
  });

  it("集計と売れ筋を slot のまま置く", () => {
    renderView({ period: DASHBOARD_PERIOD.TODAY });

    expect(screen.getByText("集計の区画")).toBeInTheDocument();
    expect(screen.getByText("売れ筋の区画")).toBeInTheDocument();
  });

  it("集計を売れ筋より先に置く", () => {
    renderView({ period: DASHBOARD_PERIOD.TODAY });

    const order = screen
      .getByText("集計の区画")
      .compareDocumentPosition(screen.getByText("売れ筋の区画"));

    expect(order & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("期間が省略されていれば today を現在地にする", () => {
    renderView({});

    expect(screen.getByRole("link", { name: "今日" })).toHaveAttribute("aria-current", "page");
  });

  it("選ばれている期間だけに現在地を示す", () => {
    renderView({ period: DASHBOARD_PERIOD.MONTH });

    expect(screen.getByRole("link", { name: "今月" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "期間を指定" })).not.toHaveAttribute("aria-current");
  });

  it("range のとき日付を選ぶ選択肢が現在地になる", () => {
    renderView({ period: DASHBOARD_PERIOD.RANGE, from: "2026-08-01", to: "2026-08-19" });

    expect(screen.getByRole("button", { name: "期間を指定" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("range のとき日付を overlay の初期値へ渡す", async () => {
    renderView({ period: DASHBOARD_PERIOD.RANGE, from: "2026-08-01", to: "2026-08-19" });

    await userEvent.click(screen.getByRole("button", { name: "期間を指定" }));

    expect(screen.getByLabelText(/開始日/)).toHaveValue("2026-08-01");
    expect(screen.getByLabelText(/終了日/)).toHaveValue("2026-08-19");
  });

  it("対象の暦日が決まっていなければその旨を出す", () => {
    renderView({ period: DASHBOARD_PERIOD.RANGE, from: "2026-08-01" });

    expect(screen.getByText("集計する期間が決まっていません。")).toBeInTheDocument();
  });

  it("a11y 検査を通る", async () => {
    const { container } = renderView(
      { period: DASHBOARD_PERIOD.TODAY },
      { from: "2026-08-19", to: "2026-08-19" },
    );

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
