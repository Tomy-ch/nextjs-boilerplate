import { describe, expect, it } from "vitest";

import type { Cart, CartLine } from "@/model/cart/cart";

import {
  hasExcludedLines,
  hasPriceChangedLines,
  orderLinesOf,
  priceChangedLines,
  priceChangedNames,
} from "./order";

function lineOf(overrides: Partial<CartLine> = {}): CartLine {
  return {
    productId: "0195f0c2-0000-7000-8000-000000000001",
    name: "ワイヤレスイヤホン",
    unitPrice: "19.99",
    quantity: 2,
    issues: [],
    availableQuantity: null,
    ...overrides,
  };
}

function cartOf(lines: readonly CartLine[]): Cart {
  return { lines, subtotalAmount: 0 };
}

const PURCHASABLE = lineOf();
const PRICE_INCREASED = lineOf({
  productId: "0195f0c2-0000-7000-8000-000000000002",
  name: "ヘッドホン",
  issues: ["priceIncreased"],
});
const PRICE_DECREASED = lineOf({
  productId: "0195f0c2-0000-7000-8000-000000000003",
  name: "ケーブル",
  issues: ["priceDecreased"],
});
const OUT_OF_STOCK = lineOf({
  productId: "0195f0c2-0000-7000-8000-000000000004",
  name: "充電器",
  issues: ["outOfStock"],
});
const NOT_FOUND = lineOf({
  productId: "0195f0c2-0000-7000-8000-000000000005",
  name: null,
  unitPrice: null,
  issues: ["notFound"],
});

describe("orderLinesOf", () => {
  // ----- 正常系 -----
  it("事情の無い明細を、商品と数量だけにして返す", () => {
    expect(orderLinesOf(cartOf([PURCHASABLE]))).toEqual([
      { productId: PURCHASABLE.productId, quantity: PURCHASABLE.quantity },
    ]);
  });

  it("値が変わっただけの明細も載せる", () => {
    expect(orderLinesOf(cartOf([PRICE_INCREASED, PRICE_DECREASED]))).toHaveLength(2);
  });

  it("空のカートでは何も載せない", () => {
    expect(orderLinesOf(cartOf([]))).toEqual([]);
  });

  // ----- 異常系 -----
  it("買えない事情のある明細を外す", () => {
    const lines = orderLinesOf(cartOf([PURCHASABLE, OUT_OF_STOCK, NOT_FOUND]));

    expect(lines).toEqual([{ productId: PURCHASABLE.productId, quantity: PURCHASABLE.quantity }]);
  });
});

describe("hasExcludedLines", () => {
  // ----- 正常系 -----
  it("買えない明細があるとき true", () => {
    expect(hasExcludedLines(cartOf([PURCHASABLE, OUT_OF_STOCK]))).toBe(true);
  });

  // ----- 異常系 -----
  it("値が変わっただけの明細は外れる明細に数えない", () => {
    expect(hasExcludedLines(cartOf([PURCHASABLE, PRICE_INCREASED]))).toBe(false);
  });
});

describe("hasPriceChangedLines", () => {
  // ----- 正常系 -----
  it("値が上がった明細があるとき true", () => {
    expect(hasPriceChangedLines(cartOf([PRICE_INCREASED]))).toBe(true);
  });

  it("値が下がった明細も同じに扱う", () => {
    expect(hasPriceChangedLines(cartOf([PRICE_DECREASED]))).toBe(true);
  });

  // ----- 異常系 -----
  it("買えない事情だけの明細は数えない", () => {
    expect(hasPriceChangedLines(cartOf([OUT_OF_STOCK]))).toBe(false);
  });

  it("事情の無いカートでは false", () => {
    expect(hasPriceChangedLines(cartOf([PURCHASABLE]))).toBe(false);
  });
});

describe("priceChangedNames", () => {
  // ----- 正常系 -----
  it("値の変わった明細の名前だけを並べる", () => {
    expect(priceChangedNames(cartOf([PURCHASABLE, PRICE_INCREASED, OUT_OF_STOCK]))).toEqual([
      "ヘッドホン",
    ]);
  });

  // ----- 異常系 -----
  it("名前を引けない明細は現れない", () => {
    expect(priceChangedNames(cartOf([NOT_FOUND]))).toEqual([]);
  });
});

describe("priceChangedLines", () => {
  // ----- 正常系 -----
  it("承知して送り直す明細を、商品と数量だけにして返す", () => {
    expect(priceChangedLines(cartOf([PURCHASABLE, PRICE_INCREASED]))).toEqual([
      { productId: PRICE_INCREASED.productId, quantity: PRICE_INCREASED.quantity },
    ]);
  });

  // ----- 異常系 -----
  it("買えない明細は含めない", () => {
    expect(priceChangedLines(cartOf([OUT_OF_STOCK]))).toEqual([]);
  });
});
