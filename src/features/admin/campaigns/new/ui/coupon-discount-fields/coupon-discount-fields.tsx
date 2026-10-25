"use client";

import { useCallback, useId } from "react";

import {
  COUPON_DISCOUNT_FORM_NAMES,
  COUPON_DISCOUNT_KIND_NAME,
  type CouponDiscountField,
  type CouponDiscountValues,
} from "../../../../coupon-discount";
import { AdminTextField } from "../../../../ui/text-field/text-field";
import { AdminRadioField, type AdminRadioOption } from "../radio-field/radio-field";

const { kind: kindName, maxAmount: maxAmountName, value: valueName } = COUPON_DISCOUNT_FORM_NAMES;

/** 種別の選択肢。並び順のまま出す。 */
const KIND_OPTIONS: readonly AdminRadioOption<"flat" | "rate">[] = [
  { value: "flat", label: COUPON_DISCOUNT_KIND_NAME.flat },
  { value: "rate", label: COUPON_DISCOUNT_KIND_NAME.rate },
];

/** `CouponDiscountFields` の props。 */
export type CouponDiscountFieldsProps = {
  /** 打たれている値。 */
  values: CouponDiscountValues;
  /** 値が変わったことを伝える。 */
  onValuesChange: (values: CouponDiscountValues) => void;
  /** 入力欄から focus が外れたことを伝える。 */
  onLeave: (field: CouponDiscountField) => void;
  /** 項目ごとの誤りの文言。 */
  messages: Readonly<Partial<Record<CouponDiscountField, string>>>;
};

/**
 * 発行するクーポンの値引きを決める欄。
 *
 * @remarks
 * **値は呼び出し元が持ちます。** 確認の面が送るときに載せ直すため、欄の側で持つと確認を開いた
 * 時点の値を外側が知りません。
 *
 * **種別を選ぶまで額の欄を出しません。** 定額はドルの額、定率は百分率で、同じ欄でも打つものの
 * 桁が違います。種別を決めずに打たせると、どちらの意味で打ったかが残りません。
 *
 * **上限の欄は定率のときだけ出します。** 契約は定額に上限を付けると拒みます。定額へ切り替えても
 * 打った上限は捨てず、定率へ戻せば元に戻ります。送るかどうかは読む側が種別で決めます。
 *
 * 額も率も数値型の入力欄にしません。decimal を数値として持たないためで、送る値は打たれた綴りから
 * 写します（[`coupon-discount`](../../../../coupon-discount.ts)）。
 *
 * @param props - 打たれている値と、その変更・離脱の通知、項目ごとの誤りの文言。
 *
 * @see Storybook `Features/Admin/Campaigns/New/CouponDiscountFields`
 */
export function CouponDiscountFields({
  messages,
  onLeave,
  onValuesChange,
  values,
}: CouponDiscountFieldsProps) {
  const idPrefix = useId();

  const changeKind = useCallback(
    (kind: "flat" | "rate") => onValuesChange({ ...values, kind }),
    [onValuesChange, values],
  );
  const changeValue = useCallback(
    (value: string) => onValuesChange({ ...values, value }),
    [onValuesChange, values],
  );
  const changeMaxAmount = useCallback(
    (maxAmount: string) => onValuesChange({ ...values, maxAmount }),
    [onValuesChange, values],
  );
  const leaveValue = useCallback(() => onLeave(valueName), [onLeave]);
  const leaveMaxAmount = useCallback(() => onLeave(maxAmountName), [onLeave]);

  return (
    <fieldset className="grid gap-4">
      <legend className="mb-2 font-emphasis text-base">値引き</legend>
      <AdminRadioField
        legend="値引きの種類"
        name={kindName}
        onValueChange={changeKind}
        options={KIND_OPTIONS}
        required={true}
        value={values.kind}
        {...(messages[kindName] === undefined ? {} : { message: messages[kindName] })}
      />
      {values.kind === "" ? null : (
        <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
          <AdminTextField
            controlId={`${idPrefix}value`}
            description={
              values.kind === "flat"
                ? "5 と打つと 5 ドル引きです。引く額は対象の額が上限です。"
                : "10 と打つと 10% 引きです。"
            }
            inputMode="decimal"
            label={values.kind === "flat" ? "値引き額（ドル）" : "値引き率（%）"}
            name={valueName}
            onLeave={leaveValue}
            onValueChange={changeValue}
            required={true}
            type="text"
            value={values.value}
            {...(messages[valueName] === undefined ? {} : { message: messages[valueName] })}
          />
          {values.kind === "rate" ? (
            <AdminTextField
              controlId={`${idPrefix}max-amount`}
              description="1 回の値引きで引ける額の上限です。空欄なら上限を設けません。"
              inputMode="decimal"
              label="上限額（ドル）"
              name={maxAmountName}
              onLeave={leaveMaxAmount}
              onValueChange={changeMaxAmount}
              required={false}
              type="text"
              value={values.maxAmount}
              {...(messages[maxAmountName] === undefined
                ? {}
                : { message: messages[maxAmountName] })}
            />
          ) : null}
        </div>
      )}
    </fieldset>
  );
}
