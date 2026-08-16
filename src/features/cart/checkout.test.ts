import { describe, expect, it } from "vitest";

import type { Cart } from "@/model/cart/cart";

import {
  CART,
  CART_WITHOUT_PURCHASABLE,
  EARPHONE_LINE,
  EMPTY_CART,
  PRICE_INCREASED_LINE,
} from "./cart.fixture";
import { canCheckout } from "./checkout";

describe("canCheckout", () => {
  // ----- 正常系 -----
  it("事情の無い明細があるとき進める", () => {
    expect(canCheckout(CART)).toBe(true);
  });

  it("買える明細が 1 件でもあれば、買えない明細が混ざっていても進める", () => {
    const cart = {
      lines: [EARPHONE_LINE, ...CART_WITHOUT_PURCHASABLE.lines],
      subtotalAmount: 5997,
    } satisfies Cart;

    expect(canCheckout(cart)).toBe(true);
  });

  // ----- 異常系 -----
  it("買える明細が 1 件も無いとき進めない", () => {
    expect(canCheckout(CART_WITHOUT_PURCHASABLE)).toBe(false);
  });

  it("値が変わっただけの明細しか無いとき進めない", () => {
    const cart = { lines: [PRICE_INCREASED_LINE], subtotalAmount: 0 } satisfies Cart;

    expect(canCheckout(cart)).toBe(false);
  });

  it("明細が 1 件も無いとき進めない", () => {
    expect(canCheckout(EMPTY_CART)).toBe(false);
  });
});
