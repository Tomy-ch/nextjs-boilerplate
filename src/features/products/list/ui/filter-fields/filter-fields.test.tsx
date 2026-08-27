// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { FILTER_KEY, type ProductListSelection } from "../../../facade/list-url/list-url";
import type { FilterOption } from "../../query";
import { ProductFilterFields } from "./filter-fields";

const CATEGORIES: readonly FilterOption[] = [
  { value: "10", label: "オーディオ" },
  { value: "20", label: "ウェアラブル" },
];

function renderFields(draft: ProductListSelection = {}, onChange = vi.fn()) {
  render(
    <ProductFilterFields
      categories={CATEGORIES}
      categoryLimit={32}
      draft={draft}
      onChange={onChange}
    />,
  );

  return onChange;
}

describe("ProductFilterFields", () => {
  it("価格・カテゴリ・在庫状況を見出し付きで並べる", () => {
    renderFields();

    expect(screen.getByRole("group", { name: "価格" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "カテゴリ" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "在庫状況" })).toBeInTheDocument();
  });

  it("効いている価格を目盛りの位置として映す", () => {
    renderFields({ [FILTER_KEY.MIN_PRICE]: "25", [FILTER_KEY.MAX_PRICE]: "250" });

    expect(screen.getByLabelText("価格の下限", { selector: "select" })).toHaveValue("2");
    expect(screen.getByLabelText("価格の上限", { selector: "select" })).toHaveValue("5");
  });

  it("効いている分類に印を付ける", () => {
    renderFields({ [FILTER_KEY.CATEGORY]: ["20"] });

    expect(screen.getByLabelText("ウェアラブル")).toBeChecked();
  });

  it("効いている在庫状況に印を付ける", () => {
    renderFields({ [FILTER_KEY.MIN_QUANTITY]: "1" });

    expect(screen.getByLabelText("在庫あり")).toBeChecked();
  });

  it("価格を選ぶと、契約のキーへ写した条件を伝える", async () => {
    const onChange = renderFields();

    await userEvent.selectOptions(screen.getByLabelText("価格の下限", { selector: "select" }), "2");

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ [FILTER_KEY.MIN_PRICE]: "25" }),
    );
  });

  it("分類を選ぶと、選んだ並びを条件として伝える", async () => {
    const onChange = renderFields({ [FILTER_KEY.CATEGORY]: ["10"] });

    await userEvent.click(screen.getByLabelText("ウェアラブル"));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ [FILTER_KEY.CATEGORY]: ["10", "20"] }),
    );
  });

  it("在庫状況を選ぶと、契約の在庫数の条件へ写して伝える", async () => {
    const onChange = renderFields();

    await userEvent.click(screen.getByLabelText("在庫なし"));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        [FILTER_KEY.MIN_QUANTITY]: "",
        [FILTER_KEY.MAX_QUANTITY]: "0",
      }),
    );
  });

  it("触っていない条件はそのまま引き継ぐ", async () => {
    const onChange = renderFields({ [FILTER_KEY.KEYWORD]: "鞄" });

    await userEvent.click(screen.getByLabelText("オーディオ"));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ [FILTER_KEY.KEYWORD]: "鞄" }));
  });

  it("同じ入力欄が 2 組同時にあっても、在庫状況の群が混ざらない", () => {
    render(
      <>
        <ProductFilterFields
          categories={CATEGORIES}
          categoryLimit={32}
          draft={{ [FILTER_KEY.MIN_QUANTITY]: "1" }}
          onChange={vi.fn()}
        />
        <ProductFilterFields
          categories={CATEGORIES}
          categoryLimit={32}
          draft={{}}
          onChange={vi.fn()}
        />
      </>,
    );

    expect(screen.getAllByLabelText("在庫あり")[0]).toBeChecked();
    expect(screen.getAllByLabelText("在庫あり")[1]).not.toBeChecked();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <ProductFilterFields
        categories={CATEGORIES}
        categoryLimit={32}
        draft={{ [FILTER_KEY.CATEGORY]: ["10"] }}
        onChange={vi.fn()}
      />,
    );

    expect((await axe(container)).violations).toEqual([]);
  });
});
