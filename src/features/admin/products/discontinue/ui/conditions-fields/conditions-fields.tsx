"use client";

import { useCallback, useId } from "react";

import { COUPON_VALIDITY_DAYS_MAX } from "@/adapters/client/api/product-discontinue-limits";

import { ProductTextField } from "../../../ui/text-field/text-field";
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
  /** 書き換えさせないあいだの理由。書き換えられるなら省く。 */
  lockedReason?: string;
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
 * `lockedReason` を渡すと、欄を `readOnly` にしてその理由を欄の組に結びます。値は送信に載り続けます。
 *
 * 値引き率は百分率で受け、数値型の入力欄にしません。送る値は打たれた綴りから写します
 * （[`coupon-rules`](../../coupon-rules.ts)）。
 *
 * @see Storybook `Features/Admin/Products/Discontinue/ConditionsFields`
 */
export function DiscontinueConditionsFields({
  lockedReason,
  messages,
  onValuesChange,
  values,
}: DiscontinueConditionsFieldsProps) {
  const idPrefix = useId();
  const lockedId = `${idPrefix}locked`;
  const locked = lockedReason !== undefined;

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
    <fieldset
      aria-describedby={locked ? lockedId : undefined}
      className="grid gap-4 sm:grid-cols-2 sm:items-start"
    >
      <legend className="mb-2 font-emphasis text-sm">代替クーポンの条件</legend>
      {locked ? (
        <p className="text-muted-foreground text-sm sm:col-span-2" id={lockedId}>
          {lockedReason}
        </p>
      ) : null}
      <ProductTextField
        controlId={`${idPrefix}rate`}
        description="10 と打つと 10% 引きです。"
        inputMode="decimal"
        label="値引き率（%）"
        name={DISCONTINUE_FORM_NAMES.couponDiscountRate}
        onLeave={leave}
        onValueChange={changeRate}
        readOnly={locked}
        required={true}
        type="text"
        value={values.couponDiscountRate}
        {...(messages.couponDiscountRate === undefined
          ? {}
          : { message: messages.couponDiscountRate })}
      />
      <ProductTextField
        controlId={`${idPrefix}days`}
        description={`発行した日から数えます。最長 ${COUPON_VALIDITY_DAYS_MAX} 日です。`}
        inputMode="numeric"
        label="有効日数"
        name={DISCONTINUE_FORM_NAMES.couponValidityDays}
        onLeave={leave}
        onValueChange={changeDays}
        readOnly={locked}
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
