import { getMyCart } from "@/adapters/server/api/cart";

import { CartView } from "./view";

/**
 * カートの取得と組み立て。
 *
 * @remarks
 * 取得のたびに明細ごとの再評価が入ります。前に開いたときから買えなくなった明細や値の変わった
 * 明細は、この取得の結果として現れます。
 *
 * 未ログインでも取得できます。主体はゲストの識別子で、持っていない利用者には空のカートが
 * 返ります（[0079](../../../docs/adr/0079-auth-frontend-seam.md) §7）。
 *
 * 失敗は route の `error` 境界が受けます（[0080](../../../docs/adr/0080-error-handling.md)）。
 */
export async function CartPageContent() {
  return <CartView cart={await getMyCart()} />;
}
