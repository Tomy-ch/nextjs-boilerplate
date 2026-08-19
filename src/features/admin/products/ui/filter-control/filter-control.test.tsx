// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import type { AdminProductFilterOption } from "../../filter-option";
import { AdminProductFilterControl } from "./filter-control";

const OPTIONS: readonly AdminProductFilterOption[] = [
  { value: "", label: "すべての分類" },
  { value: "1", label: "電子機器" },
  { value: "2", label: "書籍" },
];

function renderControl(props: Partial<Parameters<typeof AdminProductFilterControl>[0]> = {}) {
  const onSelect = vi.fn();

  render(
    <AdminProductFilterControl
      label="分類"
      onSelect={onSelect}
      options={OPTIONS}
      value=""
      {...props}
    />,
  );

  return { onSelect };
}

describe("AdminProductFilterControl", () => {
  it("何で絞り込む欄かを名前で示す", () => {
    renderControl();

    expect(screen.getByLabelText("分類")).toBeInTheDocument();
  });

  it("渡された候補をすべて並べる", () => {
    renderControl();

    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("いま選ばれている値を反映する", () => {
    renderControl({ value: "1" });

    expect(screen.getByLabelText("分類")).toHaveValue("1");
  });

  it("選び直したことを呼び出し元へ渡す", async () => {
    const { onSelect } = renderControl();

    await userEvent.selectOptions(screen.getByLabelText("分類"), "2");

    expect(onSelect).toHaveBeenCalledWith("2");
  });

  it("選ばれた値を自分では扱わない", async () => {
    const { onSelect } = renderControl();

    await userEvent.selectOptions(screen.getByLabelText("分類"), "2");

    expect(screen.getByLabelText("分類")).toHaveValue("");
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("外側の並び方を class 名で受け取る", () => {
    const { container } = render(
      <AdminProductFilterControl
        className="justify-between"
        label="分類"
        onSelect={vi.fn()}
        options={OPTIONS}
        value=""
      />,
    );

    expect(container.firstElementChild).toHaveClass("justify-between");
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(
      <AdminProductFilterControl label="分類" onSelect={vi.fn()} options={OPTIONS} value="" />,
    );

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
