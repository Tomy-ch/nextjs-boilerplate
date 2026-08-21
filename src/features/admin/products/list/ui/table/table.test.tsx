// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { BADGE_VARIANT } from "@/components/design-system/display/badge/badge.definition";
import { toProductId } from "@/model/product/product";

import type { AdminProductRow } from "../../row";
import { AdminProductTable } from "./table";

const ID = toProductId("0195f0c2-0000-7000-8000-000000000001");

function row(overrides: Partial<AdminProductRow> = {}): AdminProductRow {
  return {
    id: ID,
    name: "ワイヤレスイヤホン",
    price: "19.99",
    quantity: 12,
    categoryName: "電子機器",
    statusName: "在庫あり",
    statusTone: BADGE_VARIANT.SECONDARY,
    ...overrides,
  };
}

function renderTable(props: Partial<Parameters<typeof AdminProductTable>[0]> = {}) {
  return render(<AdminProductTable items={[row()]} {...props} />);
}

describe("AdminProductTable", () => {
  // ----- 並んでいるとき -----
  it("商品ごとに 1 行を並べる", () => {
    renderTable({
      items: [row(), row({ id: toProductId("0195f0c2-0000-7000-8000-000000000002") })],
    });

    expect(screen.getAllByRole("row")).toHaveLength(3);
  });

  it("列見出しを並べる", () => {
    renderTable();

    expect(screen.getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual([
      "商品名",
      "分類",
      "価格",
      "在庫",
      "状態",
      "操作",
    ]);
  });

  it("価格に通貨の記号を添える", () => {
    renderTable();

    expect(screen.getByRole("cell", { name: "$19.99" })).toBeInTheDocument();
  });

  it("商品名から編集へ進める", () => {
    renderTable();

    expect(screen.getByRole("link", { name: "ワイヤレスイヤホン" })).toHaveAttribute(
      "href",
      `/admin/products/${ID}/edit`,
    );
  });

  it("在庫の数から補充へ進める", () => {
    renderTable();

    expect(screen.getByRole("link", { name: "12" })).toHaveAttribute(
      "href",
      `/admin/products/${ID}/stock`,
    );
  });

  it("行の操作から編集と補充を名前で選べる", async () => {
    renderTable();

    await userEvent.click(screen.getByRole("button", { name: "ワイヤレスイヤホン の操作" }));
    const menu = await screen.findByRole("menu");

    expect(within(menu).getByRole("menuitem", { name: "編集する" })).toHaveAttribute(
      "href",
      `/admin/products/${ID}/edit`,
    );
    expect(within(menu).getByRole("menuitem", { name: "在庫を補充する" })).toHaveAttribute(
      "href",
      `/admin/products/${ID}/stock`,
    );
  });

  it("状態は行が持ち込んだ見た目で出す", () => {
    renderTable({
      items: [row({ statusName: "在庫切れ", statusTone: BADGE_VARIANT.DESTRUCTIVE })],
    });

    expect(screen.getByText("在庫切れ")).toHaveAttribute("data-variant", "destructive");
  });

  it("上に置く操作を受け取る", () => {
    renderTable({ toolbar: <p>一括の操作</p> });

    expect(screen.getByText("一括の操作")).toBeInTheDocument();
  });

  it("下に置くページ送りを受け取る", () => {
    renderTable({ pagination: <p>ページ送り</p> });

    expect(screen.getByText("ページ送り")).toBeInTheDocument();
  });

  // ----- 空のとき -----
  it("該当が無いことを本文に出す", () => {
    renderTable({ items: [] });

    expect(screen.getByText("条件に一致する商品はありません。")).toBeInTheDocument();
  });

  it("該当が無くても列見出しは残す", () => {
    renderTable({ items: [] });

    expect(screen.getAllByRole("columnheader")).toHaveLength(6);
  });

  it("a11y 検査を通る", async () => {
    const { container } = renderTable();

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
