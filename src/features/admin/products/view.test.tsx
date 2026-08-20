// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import type { AdminProductFilterOption } from "./filter-option";
import type { AdminProductListConditions } from "./query";
import { AdminProductListView } from "./view";

const CATEGORIES: readonly AdminProductFilterOption[] = [
  { value: "", label: "すべての分類" },
  { value: "1", label: "電子機器" },
];

const STATUSES: readonly AdminProductFilterOption[] = [
  { value: "", label: "すべての状態" },
  { value: "2", label: "在庫切れ" },
];

const NO_CONDITIONS: AdminProductListConditions = {
  keyword: "",
  categoryCodes: [],
  statusCodes: [],
};

function renderView(conditions: Partial<AdminProductListConditions> = {}) {
  return render(
    <AdminProductListView
      categoryOptions={CATEGORIES}
      conditions={{ ...NO_CONDITIONS, ...conditions }}
      statusOptions={STATUSES}
    >
      <p>一覧本体</p>
    </AdminProductListView>,
  );
}

function chips(): HTMLElement[] {
  return within(screen.getByRole("region", { name: "商品の検索と絞り込み" })).queryAllByRole(
    "listitem",
  );
}

describe("AdminProductListView", () => {
  // ----- 条件が効いていないとき -----
  it("一覧本体を受け取って出す", () => {
    renderView();

    expect(screen.getByText("一覧本体")).toBeInTheDocument();
  });

  it("絞り込みを landmark にまとめる", () => {
    renderView();

    expect(screen.getByRole("region", { name: "商品の検索と絞り込み" })).toBeInTheDocument();
  });

  it("検索欄と分類・状態の入力欄を出す", () => {
    renderView();

    expect(screen.getByRole("searchbox", { name: "商品名で探す" })).toBeInTheDocument();
    expect(screen.getByLabelText("分類")).toBeInTheDocument();
    expect(screen.getByLabelText("状態")).toBeInTheDocument();
  });

  it("作成への導線を絞り込みの外へ置く", () => {
    renderView();
    const create = screen.getByRole("link", { name: "商品を作成" });

    expect(create).toHaveAttribute("href", "/admin/products/new");
    expect(
      within(screen.getByRole("region", { name: "商品の検索と絞り込み" })).queryByRole("link", {
        name: "商品を作成",
      }),
    ).not.toBeInTheDocument();
  });

  it("効いている条件が無ければ chip を出さない", () => {
    renderView();

    expect(chips()).toHaveLength(0);
  });

  // ----- 条件が効いているとき -----
  it("効いている条件を chip で並べる", () => {
    renderView({ keyword: "鞄", categoryCodes: ["1"] });

    expect(chips()).toHaveLength(2);
  });

  it("chip はコードではなく表示名を出す", () => {
    renderView({ categoryCodes: ["1"] });

    expect(screen.getByText("分類: 電子機器")).toBeInTheDocument();
  });

  it("chip ごとに解除の導線を付ける", () => {
    renderView({ keyword: "鞄", categoryCodes: ["1"] });

    expect(screen.getByRole("link", { name: "分類: 電子機器 を解除" })).toHaveAttribute(
      "href",
      "/admin/products?keyword=%E9%9E%84",
    );
  });

  it("条件が 1 つだけならすべて解除は出さない", () => {
    renderView({ categoryCodes: ["1"] });

    expect(screen.queryByRole("link", { name: "条件をすべて解除" })).not.toBeInTheDocument();
  });

  it("条件が 2 つ以上ならすべて解除を出す", () => {
    renderView({ categoryCodes: ["1"], statusCodes: ["2"] });

    expect(screen.getByRole("link", { name: "条件をすべて解除" })).toHaveAttribute(
      "href",
      "/admin/products",
    );
  });

  it("a11y 検査を通る", async () => {
    const { container } = renderView({ keyword: "鞄", categoryCodes: ["1"] });

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
