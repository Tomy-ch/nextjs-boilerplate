// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import {
  COUNT_KEY,
  CURSOR_KEY,
  FILTER_KEY,
  type ProductListSelection,
} from "../../../facade/list-url/list-url";
import type { FilterOption } from "../../query";

const { push, replace, fetchProductCount } = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  fetchProductCount: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace }) }));
vi.mock("@/adapters/client/api/products", () => ({ fetchProductCount }));

import { ProductFilterDraftProvider } from "../../filter-draft";
import { ProductFilterSheet } from "./filter-sheet";

const CATEGORIES: readonly FilterOption[] = [
  { value: "10", label: "オーディオ" },
  { value: "20", label: "ウェアラブル" },
];

function renderSheet(selection: ProductListSelection = {}) {
  return render(
    <ProductFilterDraftProvider selection={selection}>
      <ProductFilterSheet categories={CATEGORIES} categoryLimit={32} selection={selection} />
    </ProductFilterDraftProvider>,
  );
}

function trigger(): HTMLElement {
  return screen.getByRole("button", { name: /絞り込み/ });
}

async function open(): Promise<void> {
  await userEvent.click(trigger());
}

beforeEach(() => {
  push.mockReset();
  replace.mockReset();
  fetchProductCount.mockReset();
  fetchProductCount.mockResolvedValue(7);
});

describe("ProductFilterSheet", () => {
  it("開くまで条件の入力欄を出さない", () => {
    renderSheet();

    expect(screen.queryByRole("group", { name: "カテゴリ" })).not.toBeInTheDocument();
  });

  it("開く操作で条件の入力欄を出す", async () => {
    renderSheet();

    await open();

    expect(screen.getByRole("group", { name: "カテゴリ" })).toBeInTheDocument();
  });

  it("効いている条件の数を開く操作に添える", () => {
    renderSheet({ [FILTER_KEY.CATEGORY]: ["10"], [FILTER_KEY.MIN_QUANTITY]: "1" });

    expect(trigger()).toHaveTextContent("2");
  });

  it("入力欄 1 つを 1 件と数え、複数選んだ分類をまとめて 1 件にする", () => {
    renderSheet({ [FILTER_KEY.CATEGORY]: ["10", "20"] });

    expect(trigger()).toHaveTextContent("1");
  });

  it("価格の範囲を選んでいれば 1 件として数える", () => {
    renderSheet({ [FILTER_KEY.MIN_PRICE]: "25" });

    expect(trigger()).toHaveTextContent("1");
  });

  it("効いている条件が無いときは数を付けない", () => {
    renderSheet();

    expect(trigger()).not.toHaveTextContent("0");
  });

  it("選んだだけでは一覧へ反映しない", async () => {
    renderSheet();

    await open();
    await userEvent.click(screen.getByLabelText("オーディオ"));

    expect(push).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("確定して初めて選んだ条件で一覧へ移る", async () => {
    renderSheet();

    await open();
    await userEvent.click(screen.getByLabelText("オーディオ"));
    await userEvent.click(screen.getByRole("button", { name: /この条件で見る/ }));

    expect(replace).toHaveBeenCalledWith("/products?categoryCodes=10");
  });

  it("確定しても、結果が届くまでは閉じない", async () => {
    renderSheet();

    await open();
    await userEvent.click(screen.getByLabelText("オーディオ"));
    await userEvent.click(screen.getByRole("button", { name: /この条件で見る/ }));

    expect(screen.getByLabelText("オーディオ")).toBeInTheDocument();
  });

  it("結果が届いたら閉じる", async () => {
    const { rerender } = renderSheet();

    await open();
    await userEvent.click(screen.getByLabelText("オーディオ"));
    await userEvent.click(screen.getByRole("button", { name: /この条件で見る/ }));

    const applied: ProductListSelection = { [FILTER_KEY.CATEGORY]: ["10"] };

    rerender(
      <ProductFilterDraftProvider selection={applied}>
        <ProductFilterSheet categories={CATEGORIES} categoryLimit={32} selection={applied} />
      </ProductFilterDraftProvider>,
    );

    expect(screen.queryByLabelText("オーディオ")).not.toBeInTheDocument();
  });

  it("条件を変えずに確定したら、移らずにその場で閉じる", async () => {
    renderSheet();

    await open();
    await userEvent.click(screen.getByRole("button", { name: /この条件で見る/ }));

    expect(replace).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("オーディオ")).not.toBeInTheDocument();
  });

  it("確定した URL に他の条件を引き継ぎ、読み進めた位置を落とす", async () => {
    renderSheet({
      [FILTER_KEY.KEYWORD]: "鞄",
      [CURSOR_KEY]: "cursor-1",
      [COUNT_KEY]: "48",
    });

    await open();
    await userEvent.click(screen.getByLabelText("オーディオ"));
    await userEvent.click(screen.getByRole("button", { name: /この条件で見る/ }));

    expect(replace).toHaveBeenCalledWith("/products?categoryCodes=10&keyword=%E9%9E%84");
  });

  it("条件をすべて外すと、入力欄が受け持つ条件だけが外れる", async () => {
    renderSheet({ [FILTER_KEY.CATEGORY]: ["10"], [FILTER_KEY.KEYWORD]: "鞄" });

    await open();
    await userEvent.click(screen.getByRole("button", { name: "条件をすべて外す" }));

    expect(screen.getByLabelText("オーディオ")).not.toBeChecked();

    await userEvent.click(screen.getByRole("button", { name: /この条件で見る/ }));

    expect(replace).toHaveBeenCalledWith("/products?keyword=%E9%9E%84");
  });

  it("確定する前の件数を確定の操作へ添える", async () => {
    renderSheet();

    await open();

    expect(await screen.findByRole("button", { name: /該当件数 7 件/ })).toBeInTheDocument();
  });

  it("開き直しても、組み立て中の条件を捨てない", async () => {
    renderSheet();

    await open();
    await userEvent.click(screen.getByLabelText("オーディオ"));
    await userEvent.keyboard("{Escape}");
    await open();

    expect(screen.getByLabelText("オーディオ")).toBeChecked();
  });

  it("開いた状態が a11y 自動検査に違反しない", async () => {
    const { container } = renderSheet();

    await open();

    expect((await axe(container)).violations).toEqual([]);
  });
});
