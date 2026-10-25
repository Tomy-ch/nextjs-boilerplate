"use client";

import { useCallback, useId } from "react";

import { COUPON_VALIDITY_DAYS_MAX } from "@/adapters/client/api/product-discontinue-limits";

import { AdminTextField } from "../../../../ui/text-field/text-field";
import { DISCONTINUE_FORM_NAMES } from "../../form-names";
import type { DiscontinueProductField } from "../../form-state";

/** 代替クーポンの条件として打たれている値。 */
export type DiscontinueConditionValues = Readonly<Record<DiscontinueProductField, string>>;

/** `DiscontinueConditionsFields` の props。 */
export type DiscontinueConditionsFieldsProps = {
  /** 打たれている値。 */
  values: DiscontinueConditionValues;
  /** 値が変わったことを伝える。 */
  onValuesChange: (values: DiscontinueConditionValues) => void;
  /** 項目ごとの誤りの文言。 */
  messages: Partial<Record<DiscontinueProductField, string>>;
};

/**
 * 廃番に添えて発行する代替クーポンの条件。
 *
 * @remarks
 * **値は呼び出し元が持ちます。** 確認の面が送るときにこの値を載せ直すため、欄の側で持つと、
 * 確認を開いた時点の値を外側が知りません。
 *
 * **既定値を置きません。** 何をどれだけ補償するかは業務の判断で、画面が値を入れておくと、
 * 確かめずに送った値と意図して打った値が区別できなくなります。
 *
 * 値引き率は百分率で受け、数値型の入力欄にしません。送る値は打たれた綴りから写します
 * （[`coupon-discount`](../../../../coupon-discount.ts)）。
 *
 * @see Storybook `Features/Admin/Products/Discontinue/ConditionsFields`
 */
export function DiscontinueConditionsFields({
  messages,
  onValuesChange,
  values,
}: DiscontinueConditionsFieldsProps) {
  const idPrefix = useId();

  const changeRate = useCallback(
    (couponDiscountRate: string) => onValuesChange({ ...values, couponDiscountRate }),
    [onValuesChange, values],
  );
  const changeDays = useCallback(
    (couponValidityDays: string) => onValuesChange({ ...values, couponValidityDays }),
    [onValuesChange, values],
  );

  /** 欄が focus を外れても、外へは何もしない。誤りは確認を開くときにまとめて出す。 */
  const leave = useCallback(() => undefined, []);

  return (
    <fieldset className="grid gap-4 sm:grid-cols-2 sm:items-start">
      <legend className="mb-2 font-emphasis text-sm">代替クーポンの条件</legend>
      <AdminTextField
        controlId={`${idPrefix}rate`}
        description="10 と打つと 10% 引きです。"
        inputMode="decimal"
        label="値引き率（%）"
        name={DISCONTINUE_FORM_NAMES.couponDiscountRate}
        onLeave={leave}
        onValueChange={changeRate}
        required={true}
        type="text"
        value={values.couponDiscountRate}
        {...(messages.couponDiscountRate === undefined
          ? {}
          : { message: messages.couponDiscountRate })}
      />
      <AdminTextField
        controlId={`${idPrefix}days`}
        description={`発行した日から数えます。最長 ${COUPON_VALIDITY_DAYS_MAX} 日です。`}
        inputMode="numeric"
        label="有効日数"
        name={DISCONTINUE_FORM_NAMES.couponValidityDays}
        onLeave={leave}
        onValueChange={changeDays}
        required={true}
        type="text"
        value={values.couponValidityDays}
        {...(messages.couponValidityDays === undefined
          ? {}
          : { message: messages.couponValidityDays })}
      />
    </fieldset>
  );
}
