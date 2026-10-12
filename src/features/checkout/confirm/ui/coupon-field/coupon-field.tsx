"use client";

import { type ReactNode, useCallback, useId } from "react";

import { Card, CardContent } from "@/components/design-system/display/card/card";
import { FieldError } from "@/components/design-system/form/field/field";
import { Label } from "@/components/design-system/form/label/label";
import {
  RadioGroupNative,
  RadioGroupNativeItem,
} from "@/components/design-system/form/radio-group-native/radio-group-native";
import { type CartCoupon, COUPON_SCOPE_NAME, type CouponId } from "@/model/coupon/coupon";
import { formatCouponDiscount, formatCouponDiscountCap } from "@/model/coupon/discount-label";
import { formatDateTime } from "@/model/datetime";
import { formatMoney } from "@/model/money";

import { usePlaceOrderState } from "../place-order-state/place-order-state";

/** {@link CouponField} の props。 */
export type CouponFieldProps = {
  /** いまのカートに使えるクーポン。読めなかったときは null。 */
  coupons: readonly CartCoupon[] | null;
};

const TITLE = "クーポン";
const UNAVAILABLE_MESSAGE = "クーポンを読み込めませんでした。クーポンを使わずに注文できます。";
const NOTE =
  "値引きは確定時の内容で決まり、ここに出ている額と異なることがあります。合計には含まれていません。";

/**
 * 確定に載せるクーポンを 1 枚選ぶ欄。
 *
 * @remarks
 * **値引き額は受け取った値をそのまま出します。** 額面と範囲から計算し直すと、金額の決定が画面へ
 * 漏れます。合計にも足し込みません。足し込んだ額は確定の時点で変わり得て、画面が約束できない
 * 金額になります。
 *
 * 「使わない」を先頭に置き、最初はどれも選んでいません。radio は一度選ぶと外せないため、使わない
 * という選択肢が無いと、一度選んだ利用者は元に戻れません。
 *
 * 選択は確定の送信状態と同じ器が持ちます（`../place-order-state`）。確定は脇と下端の帯と金額の
 * 確かめのどこからでも送られるためです。選んだ時点で反映し、「適用」の操作は置きません。
 *
 * 使えるクーポンが無いときは呼び出し元が欄ごと置きません。読めなかったときは、使わずに注文
 * できることだけを告げます。
 *
 * @param props - {@link CouponFieldProps}。
 */
export function CouponField({ coupons }: CouponFieldProps) {
  "use memo";

  const scope = useId();
  const errorId = `${scope}-error`;
  const { couponId, selectCoupon, couponErrors } = usePlaceOrderState();

  if (coupons === null) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-2">
          <h2 className="font-emphasis leading-none">{TITLE}</h2>
          <p className="text-muted-foreground text-sm">{UNAVAILABLE_MESSAGE}</p>
        </CardContent>
      </Card>
    );
  }

  const invalid = couponErrors !== undefined;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <RadioGroupNative
          aria-describedby={invalid ? errorId : undefined}
          aria-invalid={invalid || undefined}
        >
          <legend className="mb-3 font-emphasis leading-none">{TITLE}</legend>
          <CouponOption
            checked={couponId === null}
            couponId={null}
            id={`${scope}-none`}
            name={scope}
            onSelect={selectCoupon}
          >
            使わない
          </CouponOption>
          {coupons.map((coupon) => (
            <CouponOption
              checked={couponId === coupon.id}
              couponId={coupon.id}
              id={`${scope}-${coupon.id}`}
              key={coupon.id}
              name={scope}
              onSelect={selectCoupon}
            >
              <CouponSummary coupon={coupon} />
            </CouponOption>
          ))}
        </RadioGroupNative>
        {invalid ? <FieldError id={errorId}>{couponErrors.join(" ")}</FieldError> : null}
        <p className="text-muted-foreground text-xs">{NOTE}</p>
      </CardContent>
    </Card>
  );
}

/**
 * クーポンの選択肢 1 つ。
 *
 * @remarks
 * 独立した component にしているのは、選んだことを伝える関数を選択肢ごとに安定させるためです。
 *
 * @param props - 選択肢が指すクーポン、選択中かどうか、選んだことの通知、見せる中身。
 */
function CouponOption({
  checked,
  couponId,
  id,
  name,
  onSelect,
  children,
}: {
  checked: boolean;
  couponId: CouponId | null;
  id: string;
  name: string;
  onSelect: (couponId: CouponId | null) => void;
  children: ReactNode;
}) {
  "use memo";

  const select = useCallback(() => {
    onSelect(couponId);
  }, [onSelect, couponId]);

  return (
    <Label className="items-start font-normal" htmlFor={id}>
      <RadioGroupNativeItem
        checked={checked}
        className="mt-0.5"
        id={id}
        name={name}
        onChange={select}
      />
      {children}
    </Label>
  );
}

/**
 * クーポン 1 枚の額面・範囲・値引き額・期限。
 *
 * @param props - 見せるクーポン。
 */
function CouponSummary({ coupon }: { coupon: CartCoupon }) {
  const face = formatCouponDiscount(coupon.discount);
  const cap = formatCouponDiscountCap(coupon.discount);

  return (
    <span className="flex min-w-0 flex-1 flex-col gap-1">
      <span>
        {cap === undefined ? face : `${face}（${cap}）`}・{COUPON_SCOPE_NAME[coupon.scopeKind]}
      </span>
      <span className="flex flex-wrap gap-x-3 text-muted-foreground text-xs">
        <span className="font-emphasis text-foreground text-sm tabular-nums">
          {formatMoney(-coupon.discountAmount)}
        </span>
        <span>有効期限 {formatDateTime(new Date(coupon.expiresAt))}</span>
      </span>
    </span>
  );
}
