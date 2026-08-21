import type { BadgeVariant } from "@/components/design-system/display/badge/badge.definition";
import type { Product, ProductId, ProductStatus } from "@/model/product/product";

import { toStatusTone } from "./status-tone";

/**
 * 表に 1 行として並べる商品。
 *
 * @remarks
 * 利用者向けの `ProductListItem` を使いません。あちらは 1 件を 1 枚のカードで表すための形で、
 * 代表画像を持つ代わりに**状態の指し先を持ちません**。表は画像を並べない一方、状態に色を付ける
 * ために指し先が要ります。同じ型へ寄せると、どちらの画面でも使わない項目が増えていきます。
 */
export type AdminProductRow = {
  readonly id: ProductId;
  readonly name: string;
  /** USD の decimal 文字列。表示の直前まで数値へ変換しない。 */
  readonly price: string;
  readonly quantity: number;
  readonly categoryName: string;
  readonly statusName: string;
  /** 状態に対応するバッジの見た目。 */
  readonly statusTone: BadgeVariant;
};

/**
 * 商品とマスタを突き合わせて、表に並べる行へ写す。
 *
 * @remarks
 * **状態の指し先は UUID で、コードはマスタにしかありません。** 契約が商品に載せる状態は `id` と
 * 表示名だけで、絞り込みや意味づけに使う `code` はマスタ側が持ちます。見た目の割り当ては
 * コードに対して決めてあるため（{@link toStatusTone}）、ここで 1 度だけ突き合わせます。
 *
 * 表示名では突き合わせません。名前は表示のための値で、コードと違って backend 側の都合で
 * 書き換わります。
 *
 * マスタに無い状態は既定の見た目へ倒します。マスタと商品はどちらも同じ backend から同じ要求の
 * 中で取っているため通常は起こりませんが、起きたときに色を取り違えるより、決めていないことを
 * そのまま出すほうが安全です。
 *
 * @param products - 表に並べる商品
 * @param statuses - 状態のマスタ
 */
export function toAdminProductRows(
  products: readonly Product[],
  statuses: readonly ProductStatus[],
): readonly AdminProductRow[] {
  const codeById = new Map(statuses.map((status) => [status.id, status.code]));

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    price: product.price,
    quantity: product.quantity,
    categoryName: product.category.name,
    statusName: product.status.name,
    statusTone: toStatusTone(codeById.get(product.status.id)),
  }));
}
