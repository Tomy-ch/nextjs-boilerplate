import type { Cart, CartLine } from "@/model/cart/cart";
import { toProductId } from "@/model/product/product";

/**
 * 絵の要る明細が指す画像。
 *
 * @remarks
 * カタログが配る同梱の画像です。実物の URL は配信元の設定から組み立てられるため、手元のカタログ
 * からは引けません。**画像を持つ明細と持たない明細を混ぜてある**のは、代替画像へ倒れた行と並んだ
 * ときの見え方が、この画面で確かめたいものだからです。
 */
const SAMPLE_IMAGE_URL = "/src/components/design-system/display/media-image/invertocat.png";

/** 事情の無い明細。数量も在庫も足りている。 */
export const EARPHONE_LINE = {
  productId: toProductId("0195f0c2-0000-7000-8000-000000000001"),
  name: "ワイヤレスイヤホン",
  imageUrl: SAMPLE_IMAGE_URL,
  unitPrice: "19.99",
  quantity: 3,
  issues: [],
  availableQuantity: null,
} satisfies CartLine;

/** 名前が長い明細。器の幅を確かめるために実物どおりの長さを持つ。 */
export const WATCH_LINE = {
  productId: toProductId("0195f0c2-0000-7000-8000-000000000002"),
  name: "スマートウォッチ（第 2 世代・GPS 搭載モデル・ステンレスバンド付き）",
  imageUrl: SAMPLE_IMAGE_URL,
  unitPrice: "129.00",
  quantity: 1,
  issues: [],
  availableQuantity: null,
} satisfies CartLine;

/** 在庫が数量に足りない明細。今買える上限を持つ。 */
export const INSUFFICIENT_LINE = {
  productId: toProductId("0195f0c2-0000-7000-8000-000000000003"),
  name: "編組ケーブル 2m",
  imageUrl: null,
  unitPrice: "0.99",
  quantity: 5,
  issues: ["insufficientStock"],
  availableQuantity: 2,
} satisfies CartLine;

/** 在庫が無くなった明細。 */
export const OUT_OF_STOCK_LINE = {
  productId: toProductId("0195f0c2-0000-7000-8000-000000000004"),
  name: "USB-C 充電器 65W",
  imageUrl: SAMPLE_IMAGE_URL,
  unitPrice: "39.50",
  quantity: 1,
  issues: ["outOfStock"],
  availableQuantity: null,
} satisfies CartLine;

/** 値上がりした明細。買えるが小計の合算からは外れる。 */
export const PRICE_INCREASED_LINE = {
  productId: toProductId("0195f0c2-0000-7000-8000-000000000005"),
  name: "ノイズキャンセリングヘッドホン",
  imageUrl: SAMPLE_IMAGE_URL,
  unitPrice: "249.00",
  quantity: 1,
  issues: ["priceIncreased"],
  availableQuantity: null,
} satisfies CartLine;

/** 商品を引けなくなった明細。名前も単価も欠ける。 */
export const NOT_FOUND_LINE = {
  productId: toProductId("0195f0c2-0000-7000-8000-000000000006"),
  name: null,
  imageUrl: null,
  unitPrice: null,
  quantity: 2,
  issues: ["notFound"],
  availableQuantity: null,
} satisfies CartLine;

/** 事情の無いカート。小計は買える明細の合算（USD セント）。 */
export const CART = {
  lines: [EARPHONE_LINE, WATCH_LINE],
  subtotalAmount: 18897,
} satisfies Cart;

/** 買えない明細と値の変わった明細が混ざったカート。 */
export const CART_WITH_ISSUES = {
  lines: [
    EARPHONE_LINE,
    INSUFFICIENT_LINE,
    OUT_OF_STOCK_LINE,
    PRICE_INCREASED_LINE,
    NOT_FOUND_LINE,
  ],
  subtotalAmount: 5997,
} satisfies Cart;

/** 買える明細が 1 つも無いカート。購入手続きへ進ませない。 */
export const CART_WITHOUT_PURCHASABLE = {
  lines: [OUT_OF_STOCK_LINE, NOT_FOUND_LINE],
  subtotalAmount: 0,
} satisfies Cart;

/** 空のカート。 */
export const EMPTY_CART = {
  lines: [],
  subtotalAmount: 0,
} satisfies Cart;
