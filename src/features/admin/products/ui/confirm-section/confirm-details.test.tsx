// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import type { ProductValues } from "../../use-product-values";
import { ProductConfirmDetails } from "./confirm-details";

const CATEGORY_OPTIONS = [{ value: "category-1", label: "電子機器" }];
const STATUS_OPTIONS = [{ value: "status-1", label: "在庫あり" }];

const FILLED: ProductValues = {
  name: "ワイヤレスイヤホン",
  price: "19.99",
  quantity: "12",
  stockWarningThreshold: "3",
  categoryId: "category-1",
  statusId: "status-1",
  publishedAt: "2026-08-07T09:00",
  description: "<h2>特長</h2>",
};

function renderConfirm(values: ProductValues = FILLED, imageCount = 2) {
  return render(
    <ProductConfirmDetails
      categoryOptions={CATEGORY_OPTIONS}
      imageCount={imageCount}
      statusOptions={STATUS_OPTIONS}
      values={values}
    />,
  );
}

describe("ProductConfirmDetails", () => {
  it("送る内容を項目名とともに並べる", () => {
    renderConfirm();

    expect(screen.getByText("ワイヤレスイヤホン")).toBeInTheDocument();
    expect(screen.getByText("19.99")).toBeInTheDocument();
  });

  it("識別子ではなく、人が読める名前で出す", () => {
    renderConfirm();

    expect(screen.getByText("電子機器")).toBeInTheDocument();
    expect(screen.queryByText("category-1")).not.toBeInTheDocument();
  });

  it("画像は枚数で伝える", () => {
    renderConfirm();

    expect(screen.getByText("2 枚")).toBeInTheDocument();
  });

  it("商品説明を、買い手へ届くのと同じ形で出す", () => {
    renderConfirm();

    expect(screen.getByRole("heading", { name: "特長", level: 2 })).toBeInTheDocument();
  });

  it("入力欄を持たない。同じ値を 2 か所で編集させないため", () => {
    renderConfirm();

    expect(screen.queryAllByRole("textbox")).toEqual([]);
    expect(screen.queryAllByRole("combobox")).toEqual([]);
  });

  it("未入力の項目は、空欄ではなく未入力として示す", () => {
    renderConfirm({ ...FILLED, stockWarningThreshold: "" });

    expect(screen.getByText("未設定")).toBeInTheDocument();
  });

  it("分類が選べる候補に無い識別子なら、未入力として示す", () => {
    renderConfirm({ ...FILLED, categoryId: "removed-category" });

    expect(screen.queryByText("電子機器")).not.toBeInTheDocument();
    expect(screen.getByText("未設定")).toBeInTheDocument();
  });

  it("公開日時が空なら、未公開で登録することを言葉で伝える", () => {
    renderConfirm({ ...FILLED, publishedAt: "" });

    expect(screen.getByText("未公開のまま登録します")).toBeInTheDocument();
  });

  it("画像が無ければ、登録しないことを言葉で伝える", () => {
    renderConfirm(FILLED, 0);

    expect(screen.getByText("登録しません")).toBeInTheDocument();
  });

  it("説明が空なら、入っていないことを伝える", () => {
    renderConfirm({ ...FILLED, description: "" });

    expect(screen.getByText("入力されていません。")).toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderConfirm();

    expect((await axe(container)).violations).toEqual([]);
  });
});
