import type { Cart } from "@/model/cart/cart";
import type { ReferenceAmount } from "@/model/money";

import {
  hasExcludedLines,
  hasPriceChangedLines,
  orderLinesOf,
  priceChangedNames,
} from "../../../order";
import { AmountWithReference } from "../../../ui/amount-with-reference/amount-with-reference";
import { PlaceOrderForm } from "../place-order-form/place-order-form";

/** `OrderSummary` の props。 */
export type OrderSummaryProps = {
  /** 確定しようとしているカート。 */
  cart: Cart;
  /** 小計の参考換算額。読めなければ null。 */
  reference: ReferenceAmount | null;
  /** この画面の確定 1 回ぶんを表す鍵。 */
  idempotencyKey: string;
  /** 金額の大きさ。脇に貼り付ける器では控えめに出す。 */
  size?: "compact" | "prominent";
};

/**
 * 小計と確定の操作。
 *
 * @remarks
 * 器を持ちません。広い幅では本文の脇に貼り付き、狭い幅では画面の下端に固定されるため、位置は
 * 呼び出し元が決めます。
 *
 * **出せるのは小計までです。** 税と送料は購入を作った応答で初めて決まるため、確定する前に
 * 総額を出せません（[0070](../../../../../docs/adr/0070-backend-role-separation.md)）。判らない
 * ものを 0 として並べず、いつ決まるかを添えます。
 *
 * **値の変わった明細は小計に入っていません。** 合算はバックエンドが事情の無い明細だけで行うため
 * です。その明細も購入には載るので、金額が変わったことは確定の操作が押された時点で確かめます。
 */
export function OrderSummary({ cart, reference, idempotencyKey, size }: OrderSummaryProps) {
  const orderable = orderLinesOf(cart).length > 0;

  return (
    <div className="flex flex-col gap-4">
      <AmountWithReference
        amount={cart.subtotalAmount}
        label="小計"
        reference={reference}
        size={size}
      />
      <div className="flex flex-col gap-1 text-muted-foreground text-xs">
        <p>税と送料は、注文を確定した時点で決まります。</p>
        {hasExcludedLines(cart) ? <p>買えない明細は今回の購入から外れます。</p> : null}
        {hasPriceChangedLines(cart) ? (
          <p>金額の変わった明細は小計に入っていません。確定のときに確かめます。</p>
        ) : null}
      </div>
      <PlaceOrderForm
        idempotencyKey={idempotencyKey}
        orderable={orderable}
        priceChangedNames={priceChangedNames(cart)}
      />
    </div>
  );
}
