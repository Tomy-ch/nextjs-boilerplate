import type { Cart, CartLine } from "@/model/cart/cart";

/** 事情の無い明細。数量も在庫も足りている。 */
export const EARPHONE_LINE: CartLine = {
  productId: "0195f0c2-0000-7000-8000-000000000001",
  name: "ワイヤレスイヤホン",
  unitPrice: "19.99",
  quantity: 3,
  issues: [],
  availableQuantity: null,
};

/** 名前が長い明細。器の幅を確かめるために実物どおりの長さを持つ。 */
export const WATCH_LINE: CartLine = {
  productId: "0195f0c2-0000-7000-8000-000000000002",
  name: "スマートウォッチ（第 2 世代・GPS 搭載モデル・ステンレスバンド付き）",
  unitPrice: "129.00",
  quantity: 1,
  issues: [],
  availableQuantity: null,
};

/** 在庫が数量に足りない明細。今買える上限を持つ。 */
export const INSUFFICIENT_LINE: CartLine = {
  productId: "0195f0c2-0000-7000-8000-000000000003",
  name: "編組ケーブル 2m",
  unitPrice: "0.99",
  quantity: 5,
  issues: ["insufficientStock"],
  availableQuantity: 2,
};

/** 在庫が無くなった明細。 */
export const OUT_OF_STOCK_LINE: CartLine = {
  productId: "0195f0c2-0000-7000-8000-000000000004",
  name: "USB-C 充電器 65W",
  unitPrice: "39.50",
  quantity: 1,
  issues: ["outOfStock"],
  availableQuantity: null,
};

/** 値上がりした明細。買えるが小計の合算からは外れる。 */
export const PRICE_INCREASED_LINE: CartLine = {
  productId: "0195f0c2-0000-7000-8000-000000000005",
  name: "ノイズキャンセリングヘッドホン",
  unitPrice: "249.00",
  quantity: 1,
  issues: ["priceIncreased"],
  availableQuantity: null,
};

/** 商品を引けなくなった明細。名前も単価も欠ける。 */
export const NOT_FOUND_LINE: CartLine = {
  productId: "0195f0c2-0000-7000-8000-000000000006",
  name: null,
  unitPrice: null,
  quantity: 2,
  issues: ["notFound"],
  availableQuantity: null,
};

/** 事情の無いカート。小計は買える明細の合算（USD セント）。 */
export const CART: Cart = {
  lines: [EARPHONE_LINE, WATCH_LINE],
  subtotalAmount: 18897,
};

/** 買えない明細と値の変わった明細が混ざったカート。 */
export const CART_WITH_ISSUES: Cart = {
  lines: [
    EARPHONE_LINE,
    INSUFFICIENT_LINE,
    OUT_OF_STOCK_LINE,
    PRICE_INCREASED_LINE,
    NOT_FOUND_LINE,
  ],
  subtotalAmount: 5997,
};

/** 買える明細が 1 つも無いカート。購入手続きへ進ませない。 */
export const CART_WITHOUT_PURCHASABLE: Cart = {
  lines: [OUT_OF_STOCK_LINE, NOT_FOUND_LINE],
  subtotalAmount: 0,
};

/** 空のカート。 */
export const EMPTY_CART: Cart = {
  lines: [],
  subtotalAmount: 0,
};
