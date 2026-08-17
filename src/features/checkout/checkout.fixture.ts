import type { Cart, CartLine } from "@/model/cart/cart";
import type { ReferenceAmount } from "@/model/money";
import type { Purchase } from "@/model/purchase/purchase";
import type { UserProfile } from "@/model/user/user";

/** 事情の無い明細。 */
export const EARPHONE_LINE = {
  productId: "0195f0c2-0000-7000-8000-000000000001",
  name: "ワイヤレスイヤホン",
  unitPrice: "19.99",
  quantity: 3,
  issues: [],
  availableQuantity: null,
} satisfies CartLine;

/** 名前が長い明細。器の幅を確かめるために実物どおりの長さを持つ。 */
const WATCH_LINE = {
  productId: "0195f0c2-0000-7000-8000-000000000002",
  name: "スマートウォッチ（第 2 世代・GPS 搭載モデル・ステンレスバンド付き）",
  unitPrice: "129.00",
  quantity: 1,
  issues: [],
  availableQuantity: null,
} satisfies CartLine;

/** 在庫が数量に足りない明細。今回の購入からは外れる。 */
export const INSUFFICIENT_LINE = {
  productId: "0195f0c2-0000-7000-8000-000000000003",
  name: "編組ケーブル 2m",
  unitPrice: "0.99",
  quantity: 5,
  issues: ["insufficientStock"],
  availableQuantity: 2,
} satisfies CartLine;

/** 値上がりした明細。買えるが小計の合算から外れるため、今回の購入にも載らない。 */
const PRICE_INCREASED_LINE = {
  productId: "0195f0c2-0000-7000-8000-000000000005",
  name: "ノイズキャンセリングヘッドホン",
  unitPrice: "249.00",
  quantity: 1,
  issues: ["priceIncreased"],
  availableQuantity: null,
} satisfies CartLine;

/** すべての明細が確定に載るカート。 */
export const ORDERABLE_CART: Cart = {
  lines: [EARPHONE_LINE, WATCH_LINE],
  subtotalAmount: 18_897,
};

/** 一部の明細が確定から外れるカート。 */
export const PARTIALLY_ORDERABLE_CART: Cart = {
  lines: [EARPHONE_LINE, INSUFFICIENT_LINE, PRICE_INCREASED_LINE],
  subtotalAmount: 5_997,
};

/** 確定できる明細が 1 つも無いカート。 */
export const BLOCKED_CART: Cart = {
  lines: [INSUFFICIENT_LINE, PRICE_INCREASED_LINE],
  subtotalAmount: 0,
};

/** 何も入っていないカート。 */
export const EMPTY_CART: Cart = {
  lines: [],
  subtotalAmount: 0,
};

/** 届け先に使う登録情報。 */
export const PROFILE: UserProfile = {
  firstName: "太郎",
  lastName: "山田",
  email: "taro.yamada@example.com",
  phone: "09012345678",
  postalCode: "150-0001",
  prefecture: "東京都",
  city: "渋谷区",
  street: "神宮前 1-2-3",
  building: "サンプルマンション 101",
};

/** 小計（{@link ORDERABLE_CART}）の参考換算額。 */
export const SUBTOTAL_REFERENCE: ReferenceAmount = {
  currency: "JPY",
  amount: 28_346,
  rate: "150.00",
  rateDate: "2026-08-17",
};

/** 合計（{@link PURCHASE}）の参考換算額。 */
export const TOTAL_REFERENCE: ReferenceAmount = {
  currency: "JPY",
  amount: 31_931,
  rate: "150.00",
  rateDate: "2026-08-17",
};

/** 成立した購入。 */
export const PURCHASE: Purchase = {
  id: "0195f0c2-0000-7000-9000-000000000001",
  code: "0195f0c2-0000-7000-9000-000000000001",
  statusName: "未処理",
  subtotalAmount: 18_897,
  taxAmount: 1_890,
  shippingFee: 500,
  totalAmount: 21_287,
  lines: [
    {
      productId: EARPHONE_LINE.productId,
      productName: EARPHONE_LINE.name,
      quantity: EARPHONE_LINE.quantity,
      unitPrice: EARPHONE_LINE.unitPrice,
    },
    {
      productId: WATCH_LINE.productId,
      productName: WATCH_LINE.name,
      quantity: WATCH_LINE.quantity,
      unitPrice: WATCH_LINE.unitPrice,
    },
  ],
  orderedAt: new Date("2026-08-17T10:30:00+09:00"),
};
