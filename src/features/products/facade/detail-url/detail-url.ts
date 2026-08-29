import { PRODUCT_LIST_PATH } from "../list-url/list-url";

/**
 * 商品詳細の経路を組み立てる。
 *
 * @remarks
 * 正規 URL（`generateMetadata`）とサイトマップが同じ綴りを名乗るための 1 か所です。別々に
 * 書くと、片方だけ変えた日に「サイトマップが挙げる URL と、開いた画面が名乗る正規 URL が違う」
 * 状態を作れます。
 *
 * @param id - 商品の ID
 */
export function toProductDetailHref(id: string): string {
  return `${PRODUCT_LIST_PATH}/${encodeURIComponent(id)}`;
}
