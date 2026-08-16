// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useCallback } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

vi.mock("../../actions", () => ({
  clearCartAction: vi.fn(),
  removeCartItemAction: vi.fn(),
  setCartItemQuantityAction: vi.fn(),
}));

import { useCartStore } from "@/stores/cart-store";

import { CART, EMPTY_CART } from "../../cart.fixture";
import { CartRemovalNoticeProvider, useCartRemovalNotice } from "../../removal-memory";
import { CartPanel } from "./panel";

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

beforeEach(() => {
  useCartStore.setState({ isOpen: true });
});

describe("CartPanel", () => {
  it("開いているとき、脇の領域としてカートを出す", () => {
    render(<CartPanel cart={CART} />);

    expect(screen.getByRole("complementary", { name: "カート" })).toBeVisible();
  });

  it("閉じているとき、枠ごと出さない", () => {
    useCartStore.setState({ isOpen: false });

    const { container } = render(<CartPanel cart={CART} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("空のカートでは枠ごと出さない", () => {
    const { container } = render(<CartPanel cart={EMPTY_CART} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("閉じる操作で要求を下ろす", async () => {
    const user = userEvent.setup();

    render(<CartPanel cart={CART} />);
    await user.click(screen.getByRole("button", { name: "カートを閉じる" }));

    expect(useCartStore.getState().isOpen).toBe(false);
  });

  it("脇に置けない幅では出さない", () => {
    render(<CartPanel cart={CART} />);

    expect(screen.getByRole("complementary", { name: "カート" })).toHaveClass("hidden", "lg:block");
  });

  it("空でも、戻せる明細を抱えているあいだは枠を残す", async () => {
    const user = userEvent.setup();

    render(
      <CartRemovalNoticeProvider>
        <NotifyButton />
        <CartPanel cart={EMPTY_CART} />
      </CartRemovalNoticeProvider>,
    );
    await user.click(screen.getByRole("button", { name: "取り除いたことにする" }));

    expect(screen.getByRole("complementary", { name: "カート" })).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("イヤホン を削除しました");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<CartPanel cart={CART} />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
