// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { FILTER_KEY } from "../../../facade/list-url/list-url";
import type { FilterOption } from "../../query";
import { ProductFilterPanel } from "./filter-panel";

const CATEGORIES: readonly FilterOption[] = [
  { value: "c1", label: "オーディオ" },
  { value: "c2", label: "ウェアラブル" },
];

function renderPanel(props: Partial<Parameters<typeof ProductFilterPanel>[0]> = {}) {
  return render(
    <ProductFilterPanel
      categories={CATEGORIES}
      draft={{}}
      onApply={vi.fn()}
      onChange={vi.fn()}
      {...props}
    />,
  );
}

describe("ProductFilterPanel", () => {
  it("入力欄と確定の操作を積む", () => {
    renderPanel({ count: 12 });

    expect(screen.getByRole("group", { name: "価格" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "カテゴリ" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "在庫状況" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "絞り込み" })).toBeInTheDocument();
  });

  it("組み立て中の条件を入力欄へ映す", () => {
    renderPanel({ draft: { [FILTER_KEY.CATEGORY]: ["c1"] } });

    expect(screen.getByLabelText("オーディオ")).toBeChecked();
  });

  it("受け取った件数をそのまま出す", () => {
    renderPanel({ count: 12 });

    expect(screen.getByRole("status")).toHaveTextContent("該当件数 12 件");
  });

  it("確定の操作を押すと呼び出し元へ伝える", async () => {
    const onApply = vi.fn();
    renderPanel({ count: 12, onApply });

    await userEvent.click(screen.getByRole("button", { name: "絞り込み" }));

    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it("入力欄を触ると、条件の変化を呼び出し元へ伝える", async () => {
    const onChange = vi.fn();
    renderPanel({ onChange });

    await userEvent.click(screen.getByLabelText("ウェアラブル"));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ categoryId: ["c2"] }));
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderPanel({ count: 12 });

    expect((await axe(container)).violations).toEqual([]);
  });
});
