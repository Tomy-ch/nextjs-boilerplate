import { getMyCart } from "@/adapters/server/api/cart";
import { getMyProfile } from "@/adapters/server/api/users";

import { newIdempotencyKey } from "../idempotency-key";
import { readReferenceAmount } from "../reference-amount";
import { CheckoutConfirmView } from "./view";

/**
 * 購入確認の取得と組み立て。
 *
 * @remarks
 * カートと登録情報は互いを待たないため並行に取ります（CollectAll。
 * [0040](../../../../docs/adr/0040-routing-rendering-strategy.md)）。参考換算額だけは小計が
 * 決まってからでないと引けないため、後から続けます。
 *
 * **明細はこの画面で取り直します。** カートを見た時点から買えなくなった明細や値の変わった明細は、
 * この取得の結果として現れます（[screens.md](../../../../docs/screens.md) U5）。
 *
 * 冪等キーはここで 1 つ作ります。この画面を組み立てるたびに変わり、同じ画面からの送信では
 * 変わらないという単位が、二重送信を購入 1 件に畳む根拠になります。
 *
 * 失敗は route の `error` 境界が受けます（[0080](../../../../docs/adr/0080-error-handling.md)）。
 * 参考換算額だけは読めなくても投げません。
 */
export async function CheckoutConfirmPageContent() {
  const [cart, profile] = await Promise.all([getMyCart(), getMyProfile()]);

  return (
    <CheckoutConfirmView
      cart={cart}
      idempotencyKey={newIdempotencyKey()}
      profile={profile}
      reference={await readReferenceAmount(cart.subtotalAmount)}
    />
  );
}
