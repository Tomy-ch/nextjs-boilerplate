// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { FILTER_KEY } from "../../../facade/list-url/list-url";
import { ProductInvalidQuery } from "./invalid-query";

describe("ProductInvalidQuery", () => {
  // ----- 正常系 -----
  it("正規化済みの文言を示す", () => {
    render(<ProductInvalidQuery invalidKeys={[]} message="指定された条件が正しくありません。" />);

    expect(screen.getByText("指定された条件が正しくありません。")).toBeVisible();
  });

  it("条件のキーを画面上の呼び名へ直す", () => {
    render(
      <ProductInvalidQuery
        invalidKeys={[
          FILTER_KEY.CATEGORY,
          FILTER_KEY.STATUS,
          FILTER_KEY.KEYWORD,
          FILTER_KEY.SORT,
          "after",
          "first",
        ]}
        message="指定された条件が正しくありません。"
      />,
    );

    expect(
      screen.getByText(
        "確認する条件: カテゴリ、状態、キーワード、並び替え、読み込み位置、読み込む件数",
      ),
    ).toBeVisible();
  });

  it("条件を外して一覧へ戻る導線を出す", () => {
    render(<ProductInvalidQuery invalidKeys={[]} message="指定された条件が正しくありません。" />);

    expect(screen.getByRole("link", { name: "条件を外して一覧を見る" })).toHaveAttribute(
      "href",
      "/products",
    );
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <ProductInvalidQuery
        invalidKeys={[FILTER_KEY.CATEGORY]}
        message="指定された条件が正しくありません。"
      />,
    );

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });

  // ----- 異常系 -----
  it("表に無いキーはそのまま出す", () => {
    render(
      <ProductInvalidQuery
        invalidKeys={["unknownKey"]}
        message="指定された条件が正しくありません。"
      />,
    );

    expect(screen.getByText("確認する条件: unknownKey")).toBeVisible();
  });

  it("キーが無ければ行ごと出さない", () => {
    render(<ProductInvalidQuery invalidKeys={[]} message="指定された条件が正しくありません。" />);

    expect(screen.queryByText(/確認する条件/)).not.toBeInTheDocument();
  });
});
