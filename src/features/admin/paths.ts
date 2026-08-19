import type { ProductId } from "@/model/product/product";

/**
 * 商品を管理する画面のパス。
 *
 * @remarks
 * 画面を挟まず feature 直下に置きます。管理の画面どうしが互いへの導線を持ち、利用者向けの器も
 * 管理への入口をここから引くため、どれか 1 つの画面の持ち物にできません
 * （[0027](../../../docs/adr/0027-directory-structure.md)）。
 *
 * 一覧が扱う検索条件やページ送りはここに入れません。パスは admin の route 構成が変われば変わり、
 * 条件は一覧の作りが変われば変わる、別々に動くものです。
 */
export const ADMIN_PRODUCT_LIST_PATH = "/admin/products";

/** 商品を作る画面のパス。 */
export const ADMIN_PRODUCT_NEW_PATH = `${ADMIN_PRODUCT_LIST_PATH}/new`;

/** 商品を編集する画面のパス。 */
export function adminProductEditPath(id: ProductId): string {
  return `${ADMIN_PRODUCT_LIST_PATH}/${encodeURIComponent(id)}/edit`;
}

/** 在庫を補充する画面のパス。 */
export function adminProductStockPath(id: ProductId): string {
  return `${ADMIN_PRODUCT_LIST_PATH}/${encodeURIComponent(id)}/stock`;
}
