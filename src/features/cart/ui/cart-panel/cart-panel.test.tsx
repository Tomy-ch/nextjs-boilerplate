// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { type CartLineInput, useCartStore } from "@/stores/cart-store";
import { CartPanel } from "./cart-panel";

const COFFEE: CartLineInput = {
  productId: "0195f0c2-0000-7000-8000-000000000001",
  name: "深煎りブレンド",
  price: "12.34",
  statusName: "公開中",
  imageUrl: "https://media.example.test/coffee.png",
  stockQuantity: 20,
};

const TEA: CartLineInput = {
  ...COFFEE,
  productId: "0195f0c2-0000-7000-8000-000000000002",
  name: "煎茶",
  price: "0.66",
  imageUrl: null,
};

describe("CartPanel", () => {
  beforeEach(() => {
    useCartStore.setState({ lines: [] });
  });

  // ----- 正常系 -----
  it("名前のある領域として公開する", () => {
    useCartStore.getState().add(COFFEE);
    render(<CartPanel />);

    expect(screen.getByRole("complementary", { name: "カート" })).toBeVisible();
  });

  it("小計を明細から合算して出す", () => {
    useCartStore.getState().add(COFFEE);
    useCartStore.getState().add(TEA);
    render(<CartPanel />);

    expect(screen.getByText("$13.00")).toBeVisible();
  });

  it("カートへ移動する操作を出す", () => {
    useCartStore.getState().add(COFFEE);
    render(<CartPanel />);

    expect(screen.getByRole("button", { name: "カートに移動" })).toBeVisible();
  });

  it("明細だけを局所スクロールの領域に入れ、小計と操作は外に置く", () => {
    useCartStore.getState().add(COFFEE);
    render(<CartPanel />);
    const scrollable = screen.getByRole("region", { name: "カートの明細" });

    expect(within(scrollable).getByRole("list")).toBeVisible();
    expect(within(scrollable).queryByText("小計")).not.toBeInTheDocument();
    expect(
      within(scrollable).queryByRole("button", { name: "カートに移動" }),
    ).not.toBeInTheDocument();
  });

  it("明細の商品名・状態・金額・数量を並べる", () => {
    useCartStore.getState().add(COFFEE);
    render(<CartPanel />);
    const line = within(screen.getByRole("list"));

    expect(line.getByText("深煎りブレンド")).toBeVisible();
    expect(line.getByText("公開中")).toBeVisible();
    expect(line.getByText("$12.34")).toBeVisible();
    expect(line.getByText("1")).toBeVisible();
  });

  it("明細の金額はその行の小計にする", () => {
    useCartStore.getState().add(COFFEE);
    useCartStore.getState().setQuantity(COFFEE.productId, 3);
    render(<CartPanel />);

    expect(within(screen.getByRole("list")).getByText("$37.02")).toBeVisible();
  });

  it("数量によらず単価も添える", () => {
    useCartStore.getState().add(COFFEE);
    render(<CartPanel />);

    expect(screen.getByText("$12.34 / 個")).toBeVisible();
  });

  it("画像を持たない明細は代替画像を出す", () => {
    useCartStore.getState().add(TEA);
    render(<CartPanel />);

    expect(screen.getByAltText("")).toHaveAttribute(
      "src",
      expect.stringContaining(encodeURIComponent("/no-image.webp")),
    );
  });

  it("増やす操作で数量が上がる", async () => {
    useCartStore.getState().add(COFFEE);
    render(<CartPanel />);

    await userEvent.click(screen.getByRole("button", { name: "深煎りブレンド を 1 つ増やす" }));

    expect(within(screen.getByRole("list")).getByText("2")).toBeVisible();
    expect(within(screen.getByRole("list")).getByText("$24.68")).toBeVisible();
  });

  it("数量 1 から減らすと明細が消える", async () => {
    useCartStore.getState().add(COFFEE);
    render(<CartPanel />);

    await userEvent.click(screen.getByRole("button", { name: "深煎りブレンド を削除する" }));

    expect(useCartStore.getState().lines).toEqual([]);
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    useCartStore.getState().add(COFFEE);
    useCartStore.getState().add(TEA);
    const { container } = render(<CartPanel />);

    expect((await axe(container)).violations).toEqual([]);
  });

  it("在庫数まで入っている明細は増やせない", () => {
    useCartStore.getState().add({ ...COFFEE, stockQuantity: 1 });
    render(<CartPanel />);

    expect(screen.getByRole("button", { name: "深煎りブレンド を 1 つ増やす" })).toBeDisabled();
  });

  it("カートが空なら何も描画しない", () => {
    const { container } = render(<CartPanel />);

    expect(container).toBeEmptyDOMElement();
  });
});
