// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { DASHBOARD_PERIOD, type DashboardPeriod } from "../../period";

import { PeriodSwitch } from "./period-switch";

function renderSwitch(current: DashboardPeriod = DASHBOARD_PERIOD.TODAY) {
  return render(
    <PeriodSwitch current={current} rangeChoice={<button type="button">期間を指定</button>} />,
  );
}

describe("PeriodSwitch", () => {
  it("日付の要らない選択肢を link で並べる", () => {
    renderSwitch();

    expect(screen.getByRole("link", { name: "今日" })).toHaveAttribute(
      "href",
      "/admin/analytics?period=today",
    );
    expect(screen.getByRole("link", { name: "今月" })).toHaveAttribute(
      "href",
      "/admin/analytics?period=month",
    );
  });

  it("いま見ている選択肢に aria-current が付く", () => {
    renderSwitch(DASHBOARD_PERIOD.MONTH);

    expect(screen.getByRole("link", { name: "今月" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "今日" })).not.toHaveAttribute("aria-current");
  });

  it("日付を選ぶ選択肢を外から受け取って末尾に置く", () => {
    renderSwitch();

    const rangeChoice = screen.getByRole("button", { name: "期間を指定" });
    const lastLink = screen.getByRole("link", { name: "今月" });

    expect(lastLink.compareDocumentPosition(rangeChoice) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("a11y 検査を通る", async () => {
    const { container } = renderSwitch();

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
