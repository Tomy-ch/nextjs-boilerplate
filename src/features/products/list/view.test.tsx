// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { FILTER_KEY } from "../facade/list-url/list-url";
import type { FilterOption } from "./query";
import type { FilterGroup } from "./ui/filter-fields/filter-fields";
import { ProductListView } from "./view";

const CATEGORY_OPTIONS: readonly FilterOption[] = [
  { value: "", label: "すべて" },
  { value: "c1", label: "オーディオ" },
];

const STATUS_OPTIONS: readonly FilterOption[] = [
  { value: "", label: "すべて" },
  { value: "s1", label: "公開" },
];

const GROUPS: readonly FilterGroup[] = [
  { key: FILTER_KEY.CATEGORY, legend: "カテゴリ", options: CATEGORY_OPTIONS },
  { key: FILTER_KEY.STATUS, legend: "状態", options: STATUS_OPTIONS },
];

const SORT_OPTIONS: readonly FilterOption[] = [
  { value: "", label: "新着順" },
  { value: "publishedAt", label: "古い順" },
];

function renderView(selection: Readonly<Record<string, string>> = {}) {
  return render(
    <ProductListView groups={GROUPS} selection={selection} sortOptions={SORT_OPTIONS}>
      <p>一覧本体</p>
    </ProductListView>,
  );
}

describe("ProductListView", () => {
  // ----- 正常系 -----
  it("キーワードの検索欄を出す", () => {
    renderView();

    expect(screen.getByRole("searchbox", { name: "商品名で探す" })).toBeVisible();
  });

  it("並び替えの選択肢を出す", () => {
    renderView();

    expect(screen.getByRole("combobox", { name: "並び替え" })).toBeVisible();
    expect(screen.getByRole("option", { name: "古い順" })).toBeInTheDocument();
  });

  it("絞り込みを脇と下端の 2 か所に出す", () => {
    renderView();

    expect(screen.getByRole("complementary", { name: "絞り込み条件" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "絞り込み" })).toBeVisible();
  });

  it("脇の絞り込みに群ごとの選択肢を並べる", () => {
    renderView();

    expect(screen.getByRole("group", { name: "カテゴリ" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "状態" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "オーディオ" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "公開" })).toBeInTheDocument();
  });

  it("一覧本体を受け取って描く", () => {
    renderView();

    expect(screen.getByText("一覧本体")).toBeVisible();
  });

  it("いま効いているキーワードを検索欄に残す", () => {
    renderView({ [FILTER_KEY.KEYWORD]: "イヤホン" });

    expect(screen.getByRole("searchbox", { name: "商品名で探す" })).toHaveValue("イヤホン");
  });

  it("検索の送信で絞り込みと並び替えを hidden で引き継ぎ、キーワードは重複させない", () => {
    const { container } = renderView({
      [FILTER_KEY.CATEGORY]: "c1",
      [FILTER_KEY.SORT]: "publishedAt",
      [FILTER_KEY.KEYWORD]: "鞄",
      after: "cursor-1",
      first: "48",
    });

    expect(container.querySelector('input[type="hidden"][name="categoryId"]')).toHaveValue("c1");
    expect(container.querySelector('input[type="hidden"][name="sort"]')).toHaveValue("publishedAt");
    // 可視の検索欄が同じ名前を持つため、hidden 側にも載ると送信で二重になる。
    expect(container.querySelector('input[type="hidden"][name="keyword"]')).toBeNull();
    // 読み進めた位置は検索し直した時点で意味を失う。
    expect(container.querySelector('input[type="hidden"][name="after"]')).toBeNull();
    expect(container.querySelector('input[type="hidden"][name="first"]')).toBeNull();
  });

  it("条件が 2 件以上のときだけ、すべて解除する導線を出す", () => {
    renderView({ [FILTER_KEY.CATEGORY]: "c1", [FILTER_KEY.KEYWORD]: "鞄" });

    expect(screen.getByRole("link", { name: "条件をすべて解除" })).toHaveAttribute(
      "href",
      "/products",
    );
  });

  it("条件が 1 件なら、すべて解除する導線を出さない", () => {
    renderView({ [FILTER_KEY.CATEGORY]: "c1" });

    expect(screen.queryByRole("link", { name: "条件をすべて解除" })).not.toBeInTheDocument();
  });

  it("いま効いている並び順を選択済みにする", () => {
    renderView({ [FILTER_KEY.SORT]: "publishedAt" });

    expect(screen.getByRole("option", { name: "古い順", selected: true })).toBeInTheDocument();
  });

  it("いま効いている絞り込みを脇で選択済みにする", () => {
    renderView({ [FILTER_KEY.CATEGORY]: "c1" });

    expect(screen.getByRole("radio", { name: "オーディオ" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "公開" })).not.toBeChecked();
  });

  it("効いている条件の数を下端の操作に添える", () => {
    renderView({ [FILTER_KEY.CATEGORY]: "c1", [FILTER_KEY.STATUS]: "s1" });

    expect(screen.getByLabelText("2 件の条件が有効")).toBeVisible();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderView();

    expect((await axe(container)).violations).toEqual([]);
  });

  // ----- 異常系 -----
  it("条件が無ければ「すべて」を選択済みにする", () => {
    renderView();

    expect(screen.getAllByRole("radio", { checked: true, name: "すべて" })).toHaveLength(2);
    expect(screen.getByRole("radio", { name: "オーディオ" })).not.toBeChecked();
  });

  it("条件が無ければ下端の操作に数を添えない", () => {
    renderView();

    expect(screen.queryByLabelText(/件の条件が有効/)).not.toBeInTheDocument();
  });
});
