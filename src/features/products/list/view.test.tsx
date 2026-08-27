// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

const { push, fetchProductCount } = vi.hoisted(() => ({
  push: vi.fn(),
  fetchProductCount: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/adapters/client/api/products", () => ({ fetchProductCount }));

import { FILTER_KEY, type ProductListSelection } from "../facade/list-url/list-url";
import type { FilterOption } from "./query";
import { ProductListView } from "./view";

const CATEGORIES: readonly FilterOption[] = [
  { value: "10", label: "オーディオ" },
  { value: "20", label: "ウェアラブル" },
];

const SORT_OPTIONS: readonly FilterOption[] = [
  { value: "", label: "新着順" },
  { value: "publishedAt", label: "古い順" },
];

function renderView(selection: ProductListSelection = {}) {
  return render(
    <ProductListView
      categories={CATEGORIES}
      categoryLimit={32}
      selection={selection}
      sortOptions={SORT_OPTIONS}
    >
      <p>一覧本体</p>
    </ProductListView>,
  );
}

function aside(): HTMLElement {
  return screen.getByRole("complementary", { name: "絞り込み条件" });
}

/**
 * overlay を開く操作。
 *
 * @remarks
 * 脇の確定操作と名前が重なるため、脇の外にある方を採ります。実際の画面では帯ごとにどちらか
 * 一方しか描かれませんが、jsdom は CSS を持たないため両方が木に残ります。
 */
function sheetTrigger(): HTMLElement {
  const found = screen
    .getAllByRole("button", { name: /絞り込み/ })
    .find((button) => !aside().contains(button));

  if (found === undefined) {
    throw new Error("overlay を開く操作が見つかりません");
  }

  return found;
}

beforeEach(() => {
  push.mockReset();
  fetchProductCount.mockReset();
  fetchProductCount.mockResolvedValue(7);
});

describe("ProductListView", () => {
  it("キーワードの検索欄を出す", () => {
    renderView();

    expect(screen.getByRole("searchbox", { name: "商品名で探す" })).toBeInTheDocument();
  });

  it("並び替えの選択肢を出す", () => {
    renderView();

    expect(screen.getByRole("option", { name: "新着順" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "古い順" })).toBeInTheDocument();
  });

  it("一覧本体を受け取って描く", () => {
    renderView();

    expect(screen.getByText("一覧本体")).toBeVisible();
  });

  it("いま効いているキーワードを検索欄に残す", () => {
    renderView({ [FILTER_KEY.KEYWORD]: "鞄" });

    expect(screen.getByRole("searchbox", { name: "商品名で探す" })).toHaveValue("鞄");
  });

  it("いま効いている並び順を選択済みにする", () => {
    renderView({ [FILTER_KEY.SORT]: "publishedAt" });

    expect(screen.getByRole("option", { name: "古い順", selected: true })).toBeInTheDocument();
  });

  it("絞り込みを脇と下端の 2 か所に出す", () => {
    renderView();

    expect(within(aside()).getByRole("group", { name: "カテゴリ" })).toBeInTheDocument();
    expect(sheetTrigger()).toBeInTheDocument();
  });

  it("いま効いている絞り込みを脇で選択済みにする", () => {
    renderView({ [FILTER_KEY.CATEGORY]: ["10"] });

    expect(within(aside()).getByLabelText("オーディオ")).toBeChecked();
  });

  it("効いている条件を 1 つずつ外せる形で並べる", () => {
    renderView({ [FILTER_KEY.CATEGORY]: ["10"], [FILTER_KEY.KEYWORD]: "鞄" });

    expect(screen.getByRole("link", { name: /オーディオ/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /鞄/ })).toBeInTheDocument();
  });

  it("条件が 2 件以上のときだけ、すべて解除する導線を出す", () => {
    renderView({ [FILTER_KEY.CATEGORY]: ["10"], [FILTER_KEY.KEYWORD]: "鞄" });

    expect(screen.getByRole("link", { name: "条件をすべて解除" })).toBeInTheDocument();
  });

  it("条件が 1 件なら、すべて解除する導線を出さない", () => {
    renderView({ [FILTER_KEY.KEYWORD]: "鞄" });

    expect(screen.queryByRole("link", { name: "条件をすべて解除" })).not.toBeInTheDocument();
  });

  it("条件が無ければ下端の操作に数を添えない", () => {
    renderView();

    expect(sheetTrigger()).not.toHaveTextContent("0");
  });

  it("検索と絞り込みが同じ 1 つの下書きを確定する", async () => {
    renderView();

    const user = (await import("@testing-library/user-event")).default;

    await user.click(within(aside()).getByLabelText("オーディオ"));
    await user.type(screen.getByRole("searchbox", { name: "商品名で探す" }), "鞄");
    await user.click(screen.getByRole("button", { name: "検索" }));

    expect(push).toHaveBeenCalledWith("/products?categoryCodes=10&keyword=%E9%9E%84");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderView({ [FILTER_KEY.CATEGORY]: ["10"] });

    expect((await axe(container)).violations).toEqual([]);
  });
});
