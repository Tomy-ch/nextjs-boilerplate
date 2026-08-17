// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import type { FilterOption } from "../../query";
import { ProductCategoryField } from "./category-field";

const OPTIONS: readonly FilterOption[] = [
  { value: "c1", label: "オーディオ" },
  { value: "c2", label: "ウェアラブル" },
];

describe("ProductCategoryField", () => {
  it("選べる分類をチェックボックスで並べる", () => {
    render(<ProductCategoryField onChange={vi.fn()} options={OPTIONS} selected={[]} />);

    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
  });

  it("すべてに当たる選択肢を置かない", () => {
    render(<ProductCategoryField onChange={vi.fn()} options={OPTIONS} selected={[]} />);

    expect(screen.queryByLabelText("すべて")).not.toBeInTheDocument();
  });

  it("選ばれている分類にだけ印を付ける", () => {
    render(<ProductCategoryField onChange={vi.fn()} options={OPTIONS} selected={["c2"]} />);

    expect(screen.getByLabelText("ウェアラブル")).toBeChecked();
    expect(screen.getByLabelText("オーディオ")).not.toBeChecked();
  });

  it("選んでいない分類を押すと、いまの選択へ足して伝える", async () => {
    const onChange = vi.fn();
    render(<ProductCategoryField onChange={onChange} options={OPTIONS} selected={["c1"]} />);

    await userEvent.click(screen.getByLabelText("ウェアラブル"));

    expect(onChange).toHaveBeenCalledWith(["c1", "c2"]);
  });

  it("選んでいる分類を押すと、そこから外して伝える", async () => {
    const onChange = vi.fn();
    render(<ProductCategoryField onChange={onChange} options={OPTIONS} selected={["c1", "c2"]} />);

    await userEvent.click(screen.getByLabelText("オーディオ"));

    expect(onChange).toHaveBeenCalledWith(["c2"]);
  });

  it("選べる分類が無ければ選択肢を出さない", () => {
    render(<ProductCategoryField onChange={vi.fn()} options={[]} selected={[]} />);

    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <ProductCategoryField onChange={vi.fn()} options={OPTIONS} selected={["c1"]} />,
    );

    expect((await axe(container)).violations).toEqual([]);
  });
});
