"use client";

import { formatMoney } from "@/model/money";

import { usePlaceOrderState } from "../place-order-state/place-order-state";

const LABEL = "クーポン値引き（見込み）";
const NOTE = "クーポンの値引きは確定時に決まります。";

/**
 * 選んだクーポンの値引きを、集計に見込みとして 1 行で出す。
 *
 * @remarks
 * **額は受け取った値をそのまま出し、小計からは差し引きません。** 値引きは確定時に決め直されるため、
 * 差し引いた額は画面が約束できない金額になります。何も選んでいなければ何も出しません。
 */
export function CouponEstimate() {
  const { coupon } = usePlaceOrderState();

  if (coupon === null) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{LABEL}</span>
        <span className="tabular-nums">{formatMoney(-coupon.discountAmount)}</span>
      </p>
      <p className="text-muted-foreground text-xs">{NOTE}</p>
    </div>
  );
}
