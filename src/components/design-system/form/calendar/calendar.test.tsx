// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Calendar } from "./calendar";

const calendarMonth = new Date(2026, 7, 1);

describe("Calendar", () => {
  it("月の grid と日付を選択する操作を表示する", () => {
    const onSelect = vi.fn();
    render(<Calendar defaultMonth={calendarMonth} mode="single" onSelect={onSelect} />);

    const dayButton = screen
      .getAllByRole("button")
      .find((button) => button.hasAttribute("data-day"));

    expect(screen.getByRole("grid")).toBeVisible();
    if (dayButton === undefined) {
      throw new Error("日付を選択する button が見つかりません。");
    }

    fireEvent.click(dayButton);

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("月の選択、週番号、日付範囲を表示できる", () => {
    render(
      <Calendar
        captionLayout="dropdown"
        defaultMonth={calendarMonth}
        mode="range"
        selected={{ from: new Date(2026, 7, 9), to: new Date(2026, 7, 14) }}
        showOutsideDays={false}
        showWeekNumber
      />,
    );

    expect(screen.getAllByRole("combobox")).toHaveLength(2);
    expect(screen.getByRole("grid").closest("[data-week-numbers=true]")).toBeVisible();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<Calendar defaultMonth={calendarMonth} mode="single" />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
