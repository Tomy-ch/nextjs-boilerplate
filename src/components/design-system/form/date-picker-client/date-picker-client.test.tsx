// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { DatePickerClient } from "./date-picker-client";

describe("DatePickerClient", () => {
  it("初期値を表示し、calendar 選択値を hidden input へ反映する", () => {
    const onValueChange = vi.fn();
    render(
      <DatePickerClient defaultValue="2026-08-03" name="date" onValueChange={onValueChange} />,
    );
    expect(screen.getByRole("button", { name: "日付を選択" })).toHaveTextContent("2026-08-03");
    expect(screen.getByDisplayValue("2026-08-03")).toHaveAttribute("name", "date");
  });

  it("disabled を trigger に伝える", () => {
    render(<DatePickerClient disabled name="date" />);
    expect(screen.getByRole("button", { name: "日付を選択" })).toBeDisabled();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<DatePickerClient name="date" />);
    expect((await axe(container)).violations).toEqual([]);
  });

  it("trigger で calendar を開ける", async () => {
    render(<DatePickerClient name="date" />);
    await userEvent.click(screen.getByRole("button", { name: "日付を選択" }));
    expect(screen.getByRole("dialog")).toBeVisible();
  });

  it("calendar の矢印で次の月へ移動できる", async () => {
    render(<DatePickerClient defaultValue="2026-12-03" name="date" />);
    await userEvent.click(screen.getByRole("button", { name: "日付を選択" }));

    expect(screen.getByRole("button", { name: "Go to the Next Month" })).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Go to the Next Month" }));
    expect(screen.getByRole("grid")).toBeVisible();
  });

  it("日付を選ぶと hidden input へ反映し、calendar を閉じる", async () => {
    const onValueChange = vi.fn();
    render(<DatePickerClient name="date" onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole("button", { name: "日付を選択" }));

    await userEvent.click(screen.getByRole("button", { name: "Saturday, August 1st, 2026" }));

    expect(onValueChange).toHaveBeenCalledWith("2026-08-01");
    expect(screen.getByDisplayValue("2026-08-01")).toHaveAttribute("name", "date");
    expect(screen.getByRole("button", { name: "日付を選択" })).toHaveTextContent("2026-08-01");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("value を渡した場合は内部状態を持たず、呼び出し元の値を保つ", async () => {
    const onValueChange = vi.fn();
    render(<DatePickerClient name="date" onValueChange={onValueChange} value="2026-08-03" />);
    await userEvent.click(screen.getByRole("button", { name: "日付を選択" }));

    await userEvent.click(screen.getByRole("button", { name: "Saturday, August 1st, 2026" }));

    expect(onValueChange).toHaveBeenCalledWith("2026-08-01");
    expect(screen.getByDisplayValue("2026-08-03")).toHaveAttribute("name", "date");
  });

  it("日付として解釈できない値は未選択として扱う", () => {
    render(<DatePickerClient defaultValue="2026-13-99" name="date" />);

    expect(screen.getByRole("button", { name: "日付を選択" })).toHaveTextContent("日付を選択");
  });

  it("選択済みの日付をもう一度選ぶと未選択に戻す", async () => {
    const onValueChange = vi.fn();
    render(
      <DatePickerClient defaultValue="2026-08-01" name="date" onValueChange={onValueChange} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "日付を選択" }));

    await userEvent.click(
      screen.getByRole("button", { name: "Saturday, August 1st, 2026, selected" }),
    );

    expect(onValueChange).toHaveBeenCalledWith("");
    expect(screen.getByRole("button", { name: "日付を選択" })).toHaveTextContent("日付を選択");
  });
});
