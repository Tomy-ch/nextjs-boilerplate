import { getMyCart } from "@/adapters/server/api/cart";
import { readMyCartCoupons } from "@/adapters/server/api/coupons";
import { readReferenceAmount } from "@/adapters/server/api/exchange-rates";
import { getMyProfile } from "@/adapters/server/api/users";

import { withScreenSpan } from "@/observability/render-span";
import { CheckoutConfirmView } from "./view";

/**
 * 購入確認の取得と組み立て。
 *
 * @remarks
 * カートと登録情報と使えるクーポンは互いを待たないため並行に取ります（CollectAll）。参考換算額
 * だけは小計が決まってからでないと引けないため、後から続けます。
 *
 * **明細はこの画面で取り直します。** カートを見た時点から買えなくなった明細や値の変わった明細は、
 * この取得の結果として現れます（[screens.md](../../../../docs/spec/screens.md) U5）。
 *
 * 失敗は route の `error` 境界が受けます。参考換算額と使えるクーポンは読めなくても投げません。
 * どちらが無くても購入は確定できます。
 */
export const CheckoutConfirmPageContent = withScreenSpan(
  "features/checkout/confirm/page-content",
  async () => {
    const [cart, profile, coupons] = await Promise.all([
      getMyCart(),
      getMyProfile(),
      readMyCartCoupons(),
    ]);

    return (
      <CheckoutConfirmView
        cart={cart}
        coupons={coupons}
        profile={profile}
        reference={await readReferenceAmount(cart.subtotalAmount)}
      />
    );
  },
);
