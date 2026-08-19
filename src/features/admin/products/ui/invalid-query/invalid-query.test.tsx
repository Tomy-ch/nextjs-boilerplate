// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { AdminProductInvalidQuery } from "./invalid-query";

describe("AdminProductInvalidQuery", () => {
  it("渡された文言を出す", () => {
    render(<AdminProductInvalidQuery invalidKeys={[]} message="入力内容が正しくありません。" />);

    expect(screen.getByText("入力内容が正しくありません。")).toBeInTheDocument();
  });

  it("契約を外れた条件を画面上の呼び名で示す", () => {
    render(
      <AdminProductInvalidQuery invalidKeys={["categoryCodes", "keyword"]} message="不正です。" />,
    );

    expect(screen.getByText("確認する条件: 分類、キーワード")).toBeInTheDocument();
  });

  it("表に無いキーはそのまま出す", () => {
    render(<AdminProductInvalidQuery invalidKeys={["sort"]} message="不正です。" />);

    expect(screen.getByText("確認する条件: sort")).toBeInTheDocument();
  });

  it("外れた条件が無ければその行を出さない", () => {
    render(<AdminProductInvalidQuery invalidKeys={[]} message="不正です。" />);

    expect(screen.queryByText(/確認する条件/)).not.toBeInTheDocument();
  });

  it("条件を外して一覧へ戻る導線を添える", () => {
    render(<AdminProductInvalidQuery invalidKeys={["keyword"]} message="不正です。" />);

    expect(screen.getByRole("link", { name: "条件を外して一覧を見る" })).toHaveAttribute(
      "href",
      "/admin/products",
    );
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(
      <AdminProductInvalidQuery invalidKeys={["keyword"]} message="不正です。" />,
    );

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
