// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Calendar } from "./calendar";

const calendarMonth = new Date(2026, 7, 1);

describe("Calendar", () => {
  it("月の grid と日付を選択する操作を表示する", async () => {
    const onSelect = vi.fn();
    render(<Calendar defaultMonth={calendarMonth} mode="single" onSelect={onSelect} />);

    const dayButton = screen
      .getAllByRole("button")
      .find((button) => button.hasAttribute("data-day"));

    expect(screen.getByRole("grid")).toBeVisible();
    if (dayButton === undefined) {
      throw new Error("日付を選択する button が見つかりません。");
    }

    await userEvent.click(dayButton);

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

describe("CalendarDayButton", () => {
  it("日付ごとに、その日を data 属性として持つ button を描画する", () => {
    render(<Calendar defaultMonth={calendarMonth} mode="single" />);

    const dayButtons = screen
      .getAllByRole("button")
      .filter((button) => button.hasAttribute("data-day"));

    expect(dayButtons.length).toBeGreaterThan(0);
    expect(dayButtons[0]?.getAttribute("data-day")).not.toBe("");
  });

  it("選択した日を単独選択として印を付ける", () => {
    render(<Calendar defaultMonth={calendarMonth} mode="single" selected={calendarMonth} />);

    const selected = screen
      .getAllByRole("button")
      .find((button) => button.getAttribute("data-selected-single") === "true");

    expect(selected).toBeDefined();
  });

  it("何も選んでいなければ単独選択の印を付けない", () => {
    render(<Calendar defaultMonth={calendarMonth} mode="single" />);

    const selected = screen
      .getAllByRole("button")
      .find((button) => button.getAttribute("data-selected-single") === "true");

    expect(selected).toBeUndefined();
  });
});
