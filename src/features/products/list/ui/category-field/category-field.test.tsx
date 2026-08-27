// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import type { FilterOption } from "../../query";
import { ProductCategoryField } from "./category-field";

const OPTIONS: readonly FilterOption[] = [
  { value: "10", label: "オーディオ" },
  { value: "20", label: "ウェアラブル" },
];

/** 上限に届かない数。上限そのものを見る場合を除き、この値で覆わないようにする。 */
const ROOMY_LIMIT = 32;

describe("ProductCategoryField", () => {
  it("選べる分類をチェックボックスで並べる", () => {
    render(
      <ProductCategoryField
        limit={ROOMY_LIMIT}
        onChange={vi.fn()}
        options={OPTIONS}
        selected={[]}
      />,
    );

    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
  });

  it("すべてに当たる選択肢を置かない", () => {
    render(
      <ProductCategoryField
        limit={ROOMY_LIMIT}
        onChange={vi.fn()}
        options={OPTIONS}
        selected={[]}
      />,
    );

    expect(screen.queryByLabelText("すべて")).not.toBeInTheDocument();
  });

  it("選ばれている分類にだけ印を付ける", () => {
    render(
      <ProductCategoryField
        limit={ROOMY_LIMIT}
        onChange={vi.fn()}
        options={OPTIONS}
        selected={["20"]}
      />,
    );

    expect(screen.getByLabelText("ウェアラブル")).toBeChecked();
    expect(screen.getByLabelText("オーディオ")).not.toBeChecked();
  });

  it("選んでいない分類を押すと、いまの選択へ足して伝える", async () => {
    const onChange = vi.fn();
    render(
      <ProductCategoryField
        limit={ROOMY_LIMIT}
        onChange={onChange}
        options={OPTIONS}
        selected={["10"]}
      />,
    );

    await userEvent.click(screen.getByLabelText("ウェアラブル"));

    expect(onChange).toHaveBeenCalledWith(["10", "20"]);
  });

  it("選んでいる分類を押すと、そこから外して伝える", async () => {
    const onChange = vi.fn();
    render(
      <ProductCategoryField
        limit={ROOMY_LIMIT}
        onChange={onChange}
        options={OPTIONS}
        selected={["10", "20"]}
      />,
    );

    await userEvent.click(screen.getByLabelText("オーディオ"));

    expect(onChange).toHaveBeenCalledWith(["20"]);
  });

  it("選べる分類が無ければ選択肢を出さない", () => {
    render(
      <ProductCategoryField limit={ROOMY_LIMIT} onChange={vi.fn()} options={[]} selected={[]} />,
    );

    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("上限に届くまでは上限の告知を出さない", () => {
    render(
      <ProductCategoryField limit={2} onChange={vi.fn()} options={OPTIONS} selected={["10"]} />,
    );

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("上限に達したら、いくつまで選べるかを伝える", () => {
    render(
      <ProductCategoryField
        limit={2}
        onChange={vi.fn()}
        options={OPTIONS}
        selected={["10", "20"]}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("カテゴリは 2 件まで選べます。");
  });

  it("上限に達したら、選んでいない分類を選べなくする", () => {
    render(
      <ProductCategoryField limit={1} onChange={vi.fn()} options={OPTIONS} selected={["10"]} />,
    );

    expect(screen.getByLabelText("ウェアラブル")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByLabelText("オーディオ")).not.toHaveAttribute("aria-disabled");
  });

  it("上限に達しても、選べなくした分類を押した結果は伝えない", async () => {
    const onChange = vi.fn();
    render(
      <ProductCategoryField limit={1} onChange={onChange} options={OPTIONS} selected={["10"]} />,
    );

    await userEvent.click(screen.getByLabelText("ウェアラブル"));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("上限に達していても、選んでいる分類は外せる", async () => {
    const onChange = vi.fn();
    render(
      <ProductCategoryField limit={1} onChange={onChange} options={OPTIONS} selected={["10"]} />,
    );

    await userEvent.click(screen.getByLabelText("オーディオ"));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <ProductCategoryField
        limit={ROOMY_LIMIT}
        onChange={vi.fn()}
        options={OPTIONS}
        selected={["10"]}
      />,
    );

    expect((await axe(container)).violations).toEqual([]);
  });

  it("上限に達した状態でも a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <ProductCategoryField limit={1} onChange={vi.fn()} options={OPTIONS} selected={["10"]} />,
    );

    expect((await axe(container)).violations).toEqual([]);
  });
});
