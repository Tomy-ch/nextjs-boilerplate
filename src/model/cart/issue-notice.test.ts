import { describe, expect, it } from "vitest";

import type { CartLine } from "./cart";
import { cartIssueNotice, hasBlockingIssue, isPurchasable } from "./issue-notice";

/** 事情の無い明細。 */
const EARPHONE_LINE = {
  productId: "0195f0c2-0000-7000-8000-000000000001",
  name: "ワイヤレスイヤホン",
  unitPrice: "19.99",
  quantity: 3,
  issues: [],
  availableQuantity: null,
} satisfies CartLine;

/** 在庫が数量に足りない明細。 */
const INSUFFICIENT_LINE = {
  productId: "0195f0c2-0000-7000-8000-000000000003",
  name: "編組ケーブル 2m",
  unitPrice: "0.99",
  quantity: 5,
  issues: ["insufficientStock"],
  availableQuantity: 2,
} satisfies CartLine;

/** 値上がりした明細。 */
const PRICE_INCREASED_LINE = {
  productId: "0195f0c2-0000-7000-8000-000000000005",
  name: "ノイズキャンセリングヘッドホン",
  unitPrice: "249.00",
  quantity: 1,
  issues: ["priceIncreased"],
  availableQuantity: null,
} satisfies CartLine;

/** 商品を引けなくなった明細。 */
const NOT_FOUND_LINE = {
  productId: "0195f0c2-0000-7000-8000-000000000006",
  name: null,
  unitPrice: null,
  quantity: 2,
  issues: ["notFound"],
  availableQuantity: null,
} satisfies CartLine;

describe("cartIssueNotice", () => {
  // ----- 正常系 -----
  it("商品を引けないとき、取り扱いが終わったことを買えない事情として返す", () => {
    expect(cartIssueNotice("notFound", null)).toEqual({
      blocking: true,
      message: "この商品は取り扱いが終了しました。",
    });
  });

  it("公開が止まっているとき、買えない事情として返す", () => {
    expect(cartIssueNotice("unpublished", null).blocking).toBe(true);
  });

  it("在庫が無いとき、買えない事情として返す", () => {
    expect(cartIssueNotice("outOfStock", null)).toEqual({
      blocking: true,
      message: "在庫がありません。",
    });
  });

  it("在庫が足りないとき、今買える数を文面へ差し込む", () => {
    expect(cartIssueNotice("insufficientStock", 2).message).toBe("在庫が 2 個までです。");
  });

  it("値上がりは買えない事情として扱わない", () => {
    expect(cartIssueNotice("priceIncreased", null)).toEqual({
      blocking: false,
      message: "カートに入れたときより価格が上がっています。",
    });
  });

  it("値下がりも買えない事情として扱わない", () => {
    expect(cartIssueNotice("priceDecreased", null).blocking).toBe(false);
  });

  it("在庫が足りないのに上限が判らないとき、数を伏せて伝える", () => {
    expect(cartIssueNotice("insufficientStock", null).message).toBe("在庫が足りません。");
  });
});

describe("isPurchasable", () => {
  // ----- 正常系 -----
  it("事情が 1 つも無いとき買える", () => {
    expect(isPurchasable(EARPHONE_LINE)).toBe(true);
  });

  // ----- 異常系 -----
  it("値が変わっただけでも、合算の対象から外れるため買えない扱いにする", () => {
    expect(isPurchasable(PRICE_INCREASED_LINE)).toBe(false);
  });

  it("買えない事情があるとき買えない", () => {
    expect(isPurchasable(NOT_FOUND_LINE)).toBe(false);
  });
});

describe("hasBlockingIssue", () => {
  // ----- 正常系 -----
  it("在庫が足りない明細は買えない事情を持つ", () => {
    expect(hasBlockingIssue(INSUFFICIENT_LINE)).toBe(true);
  });

  it("事情が 1 つも無い明細は買えない事情を持たない", () => {
    expect(hasBlockingIssue(EARPHONE_LINE)).toBe(false);
  });

  // ----- 異常系 -----
  it("値が変わっただけの明細は買えない事情を持たない", () => {
    expect(hasBlockingIssue(PRICE_INCREASED_LINE)).toBe(false);
  });
});
