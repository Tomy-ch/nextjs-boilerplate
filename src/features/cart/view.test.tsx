// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useCallback } from "react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

vi.mock("./actions", () => ({
  clearCartAction: vi.fn(),
  removeCartItemAction: vi.fn(),
  setCartItemQuantityAction: vi.fn(),
}));

import { CART, CART_WITH_ISSUES, EMPTY_CART } from "./cart.fixture";
import { CartRemovalNoticeProvider, useCartRemovalNotice } from "./removal-memory";
import { CartView } from "./view";

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

describe("CartView", () => {
  it("明細をすべて並べる", () => {
    render(<CartView cart={CART_WITH_ISSUES} />);

    const lines = screen.getByRole("region", { name: "カートの明細" });

    expect(within(lines).getAllByRole("button", { name: /を削除する$/ })).toHaveLength(
      CART_WITH_ISSUES.lines.length,
    );
  });

  it("集計を明細の脇に貼り付ける", () => {
    render(<CartView cart={CART} />);

    expect(screen.getByRole("complementary", { name: "お支払い金額" })).toHaveClass("lg:sticky");
  });

  it("脇に置けない幅では、同じ集計を画面の下から出す", () => {
    render(<CartView cart={CART} />);

    expect(screen.getAllByText("$188.97")).toHaveLength(2);
    expect(screen.getByRole("complementary", { name: "お支払い金額" })).toHaveClass("hidden");
  });

  it("カートを空にする操作を出す", () => {
    render(<CartView cart={CART} />);

    expect(screen.getByRole("button", { name: "カートを空にする" })).toBeVisible();
  });

  it("空のとき、商品を探しに戻る導線を出す", () => {
    render(<CartView cart={EMPTY_CART} />);

    expect(screen.getByText("カートに商品が入っていません。")).toBeVisible();
    expect(screen.getByRole("link", { name: "商品を探す" })).toHaveAttribute("href", "/products");
  });

  it("空のとき、明細も集計も出さない", () => {
    render(<CartView cart={EMPTY_CART} />);

    expect(screen.queryByRole("region", { name: "カートの明細" })).not.toBeInTheDocument();
    expect(screen.queryByText("小計")).not.toBeInTheDocument();
  });

  it("空になった後も、戻せる明細があれば取り消しを出す", async () => {
    const user = userEvent.setup();

    render(
      <CartRemovalNoticeProvider>
        <NotifyButton />
        <CartView cart={EMPTY_CART} />
      </CartRemovalNoticeProvider>,
    );
    await user.click(screen.getByRole("button", { name: "取り除いたことにする" }));

    expect(screen.getByRole("status")).toHaveTextContent("イヤホン を削除しました");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<CartView cart={CART_WITH_ISSUES} />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
