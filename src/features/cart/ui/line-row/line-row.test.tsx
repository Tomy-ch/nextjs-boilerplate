// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

vi.mock("../../actions", () => ({
  removeCartItemAction: vi.fn(),
  setCartItemQuantityAction: vi.fn(),
}));

import {
  EARPHONE_LINE,
  INSUFFICIENT_LINE,
  NOT_FOUND_LINE,
  OUT_OF_STOCK_LINE,
} from "../../cart.fixture";
import { CartLineRow } from "./line-row";

/** 行 1 つを、器の中に置いて描く。 */
function renderRow(line: Parameters<typeof CartLineRow>[0]["line"]) {
  return render(
    <ul>
      <CartLineRow line={line} />
    </ul>,
  );
}

describe("CartLineRow", () => {
  it("商品名から詳細へ辿れるようにする", () => {
    renderRow(EARPHONE_LINE);

    expect(screen.getByRole("link", { name: EARPHONE_LINE.name })).toHaveAttribute(
      "href",
      `/products/${EARPHONE_LINE.productId}`,
    );
  });

  it("単価を 1 個あたりの金額として出す", () => {
    renderRow(EARPHONE_LINE);

    expect(screen.getByText("$19.99 / 個")).toBeVisible();
  });

  it("数量を増減できるようにする", () => {
    renderRow(EARPHONE_LINE);

    expect(
      screen.getByRole("button", { name: `${EARPHONE_LINE.name} を 1 つ増やす` }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: `${EARPHONE_LINE.name} を 1 つ減らす` }),
    ).toBeVisible();
  });

  it("在庫が足りない明細では、今買える数を数量の上限にする", () => {
    renderRow(INSUFFICIENT_LINE);

    expect(
      screen.getByRole("button", { name: `${INSUFFICIENT_LINE.name} を 1 つ増やす` }),
    ).toBeDisabled();
  });

  it("事情が立っているとき、その行の中に注記を出す", () => {
    renderRow(OUT_OF_STOCK_LINE);

    expect(screen.getByText("在庫がありません。")).toBeVisible();
  });

  it("買えない明細は弱めて見せる", () => {
    renderRow(OUT_OF_STOCK_LINE);

    expect(screen.getByRole("link", { name: OUT_OF_STOCK_LINE.name })).toHaveClass(
      "text-muted-foreground",
    );
  });

  it("買えない明細でも取り除く操作は残す", () => {
    renderRow(OUT_OF_STOCK_LINE);

    expect(
      screen.getByRole("button", { name: `${OUT_OF_STOCK_LINE.name} を削除する` }),
    ).toBeEnabled();
  });

  it("商品を引けなかった明細は、名前の代わりを出して詳細へ辿らせない", () => {
    renderRow(NOT_FOUND_LINE);

    expect(screen.getByText("取得できない商品")).toBeVisible();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("単価が欠けている明細では金額を出さない", () => {
    renderRow(NOT_FOUND_LINE);

    expect(screen.queryByText(/\/ 個/)).not.toBeInTheDocument();
  });

  it("商品を引けなかった明細でも、名前の代わりで操作を区別できるようにする", () => {
    renderRow(NOT_FOUND_LINE);

    expect(screen.getByRole("button", { name: "取得できない商品 を削除する" })).toBeVisible();
  });

  it("サムネイルを装飾として出し、商品名を二度読ませない", () => {
    const { container } = renderRow({ ...EARPHONE_LINE, imageUrl: "/products/1.png" });

    expect(container.querySelector("[data-slot=media-image-image]")).toHaveAttribute(
      "src",
      expect.stringContaining("%2Fproducts%2F1.png"),
    );
    expect(screen.queryAllByRole("img")).toHaveLength(0);
  });

  it("画像を持たない明細は代替画像へ倒す", () => {
    const { container } = renderRow({ ...EARPHONE_LINE, imageUrl: null });

    expect(container.querySelector("[data-slot=media-image-image]")).toHaveAttribute(
      "src",
      "/no-image.svg",
    );
  });

  it("買えない明細はサムネイルも弱める", () => {
    const { container } = renderRow(OUT_OF_STOCK_LINE);

    expect(container.querySelector("[data-slot=media-image]")).toHaveClass("opacity-60");
  });

  it("事情の無い明細はサムネイルを弱めない", () => {
    const { container } = renderRow(EARPHONE_LINE);

    expect(container.querySelector("[data-slot=media-image]")).not.toHaveClass("opacity-60");
  });

  it("サムネイルの大きさを、狭い器と広い器の両方について宣言する", () => {
    const { container } = renderRow(EARPHONE_LINE);

    expect(container.querySelector("[data-slot=media-image]")).toHaveClass("w-12", "@sm/line:w-16");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderRow(INSUFFICIENT_LINE);

    expect((await axe(container)).violations).toEqual([]);
  });
});
