// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useCallback } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../actions", () => ({
  clearCartAction: vi.fn(),
  removeCartItemAction: vi.fn(),
  setCartItemQuantityAction: vi.fn(),
}));

import { CART, CART_WITHOUT_PURCHASABLE, EMPTY_CART } from "../../cart.fixture";
import { CartRemovalNoticeProvider, useCartRemovalNotice } from "../../removal-memory";
import { CartContents } from "./contents";

/** 取り除きを器へ知らせる引き手。 */
function NotifyButton() {
  const notice = useCartRemovalNotice();
  const notify = useCallback(
    () => notice?.notify({ productId: "p-9", name: "イヤホン", quantity: 1 }, []),
    [notice],
  );

  return (
    <button type="button" onClick={notify}>
      取り除いたことにする
    </button>
  );
}

describe("CartContents", () => {
  it("小計と明細を並べる", () => {
    render(<CartContents cart={CART} />);

    expect(screen.getByText("小計")).toBeVisible();
    expect(screen.getByText("$188.97")).toBeVisible();
    expect(screen.getAllByRole("listitem")).toHaveLength(CART.lines.length);
  });

  it("購入手続きとカートページの 2 本の導線を出す", () => {
    render(<CartContents cart={CART} />);

    expect(screen.getByRole("link", { name: "購入手続きへ" })).toBeVisible();
    expect(screen.getByRole("link", { name: "カートを見る" })).toHaveAttribute("href", "/cart");
  });

  it("明細だけを局所スクロールさせる", () => {
    render(<CartContents cart={CART} />);

    expect(screen.getByRole("region", { name: "カートの明細" })).toBeInTheDocument();
  });

  it("カートを空にする操作を出す", () => {
    render(<CartContents cart={CART} />);

    expect(screen.getByRole("button", { name: "カートを空にする" })).toBeVisible();
  });

  it("買える明細が無いとき、購入手続きへ進ませない", () => {
    render(<CartContents cart={CART_WITHOUT_PURCHASABLE} />);

    expect(screen.getByRole("button", { name: "購入手続きへ" })).toBeDisabled();
  });

  it("空のとき、入っていないことだけを伝える", () => {
    render(<CartContents cart={EMPTY_CART} />);

    expect(screen.getByText("カートに商品が入っていません。")).toBeVisible();
    expect(screen.queryByText("小計")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "購入手続きへ" })).not.toBeInTheDocument();
  });

  it("空になった後も、戻せる明細があれば取り消しを出す", async () => {
    const user = userEvent.setup();

    render(
      <CartRemovalNoticeProvider>
        <NotifyButton />
        <CartContents cart={EMPTY_CART} />
      </CartRemovalNoticeProvider>,
    );
    await user.click(screen.getByRole("button", { name: "取り除いたことにする" }));

    expect(screen.getByRole("status")).toHaveTextContent("イヤホン を削除しました");
  });
});
