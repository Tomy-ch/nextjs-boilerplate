import {
  BADGE_VARIANT,
  type BadgeVariant,
} from "@/components/design-system/display/badge/badge.definition";
import {
  isDiscontinued,
  type Product,
  type ProductId,
  type ProductStatus,
} from "@/model/product/product";

import { toStatusTone } from "./status-tone";

/**
 * 廃番の商品の状態として出す名前。
 *
 * @remarks
 * マスタの `廃盤`(7) とは別物です。あちらは admin が手で付けられる表示上のラベルで、こちらは
 * 廃番のジャーニーが立てた事実を指します。同じ欄に並ぶため、綴りが重ならないようにしてあります。
 */
const DISCONTINUED_STATUS_NAME = "廃番";

/**
 * 廃番の商品の見た目。
 *
 * @remarks
 * **マスタのどのラベルよりも強く出します。**廃番は取り消せない確定した扱いで、admin が手で
 * 付け替えられるラベルとは重さが違います。色ではなく明暗の反転で差を付けるのは、廃番が
 * 失敗でも注意喚起でもないためです（{@link toStatusTone} の区分は色で分けています）。
 */
const DISCONTINUED_STATUS_TONE: BadgeVariant = BADGE_VARIANT.DEFAULT;

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
 * **廃番の商品はマスタのラベルを出しません。**廃番にしてもマスタの状態は書き換わらないため、
 * ラベルをそのまま出すと、買えない商品が「在庫あり」として並びます。状態の欄が答えるのは
 * 「いまこの商品をどう扱うか」で、廃番はその答えとして他のどのラベルより先に立ちます。
 *
 * @param products - 表に並べる商品
 * @param statuses - 状態のマスタ
 */
export function toAdminProductRows(
  products: readonly Product[],
  statuses: readonly ProductStatus[],
): readonly AdminProductRow[] {
  const codeById = new Map(statuses.map((status) => [status.id, status.code]));

  return products.map((product) => {
    const discontinued = isDiscontinued(product);

    return {
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: product.quantity,
      categoryName: product.category.name,
      statusName: discontinued ? DISCONTINUED_STATUS_NAME : product.status.name,
      statusTone: discontinued
        ? DISCONTINUED_STATUS_TONE
        : toStatusTone(codeById.get(product.status.id)),
    };
  });
}
