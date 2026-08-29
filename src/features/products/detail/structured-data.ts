import type { Product } from "@/model/product/product";

/** 契約が価格を表す通貨。`Product.price` は USD の decimal 文字列。 */
const PRICE_CURRENCY = "USD";

/** schema.org の在庫状態。 */
const AVAILABILITY = {
  inStock: "https://schema.org/InStock",
  outOfStock: "https://schema.org/OutOfStock",
} as const;

/**
 * 商品 1 件を schema.org の `Product` へ写す。
 *
 * @remarks
 * 載せるのは、画面に出ている値のうち語彙が受け取るものだけです。説明は markup を持つため
 * 載せません —— 構造化データは平文の場所で、切り詰めた要約は meta description が持ちます。
 *
 * `url` は持ちません。絶対 URL を組めるのは外から見た origin を知っている `app` だけで、feature は
 * 設定を読みません。どこにあるかは画面の正規 URL が伝えます。
 *
 * @param product - 表示する商品
 * @param imageUrls - 解決済みの画像 URL。表示順
 */
export function toProductStructuredData(
  product: Product,
  imageUrls: readonly string[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.id,
    category: product.category.name,
    ...(imageUrls.length === 0 ? {} : { image: [...imageUrls] }),
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: PRICE_CURRENCY,
      availability: product.quantity > 0 ? AVAILABILITY.inStock : AVAILABILITY.outOfStock,
    },
  };
}
