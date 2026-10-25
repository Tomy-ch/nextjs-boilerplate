"use client";

import { useCallback, useId } from "react";

import { Button } from "@/components/design-system/action/button/button";

import { AdminTextField } from "../../../../ui/text-field/text-field";
import { ISSUE_FORM_NAMES } from "../../form-names";
import { ISSUE_FIELD_LABELS, type IssueOwnField } from "../../form-state";
import type { IssueOwnValues } from "../../issue-rules";

/** `IssueValidityFields` の props。 */
export type IssueValidityFieldsProps = {
  /** 打たれている有効期限・利用開始・最低購入額。持ち主は呼び出し元。 */
  values: IssueOwnValues;
  /** 欄の値が変わったことを伝える。 */
  onValueChange: (field: IssueOwnField, value: string) => void;
  /** 欄から離れたことを伝える。誤りを見せる合図になる。 */
  onLeave: (field: IssueOwnField) => void;
  /** 欄ごとに出す誤りの文言。 */
  messages: Readonly<Partial<Record<IssueOwnField, string>>>;
};

/**
 * 発行するクーポンの有効期限・利用開始・最低購入額の欄。
 *
 * @param props - {@link IssueValidityFieldsProps} を参照。
 * @see Storybook `Features/Admin/Users/CouponNew/ValidityFields`
 */
export function IssueValidityFields({
  messages,
  onLeave,
  onValueChange,
  values,
}: IssueValidityFieldsProps) {
  const idPrefix = useId();

  const change = useCallback(
    (field: IssueOwnField) => (value: string) => onValueChange(field, value),
    [onValueChange],
  );
  const leave = useCallback((field: IssueOwnField) => () => onLeave(field), [onLeave]);
  const clearUsableFrom = useCallback(() => onValueChange("usableFrom", ""), [onValueChange]);

  return (
    <fieldset className="grid gap-4">
      <legend className="mb-2 font-emphasis text-base">期限と条件</legend>
      <p className="text-muted-foreground text-sm">日時はこの端末の時間帯で入力します。</p>
      <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
        <AdminTextField
          controlId={`${idPrefix}expiresAt`}
          description="この日時からは使えなくなります。"
          label={ISSUE_FIELD_LABELS.expiresAt}
          name={ISSUE_FORM_NAMES.expiresAt}
          onLeave={leave("expiresAt")}
          onValueChange={change("expiresAt")}
          required={true}
          type="datetime-local"
          value={values.expiresAt}
          {...(messages.expiresAt === undefined ? {} : { message: messages.expiresAt })}
        />
        <div className="grid gap-2">
          <AdminTextField
            controlId={`${idPrefix}usableFrom`}
            description="空欄なら発行した時点から使えます。有効期限より前にします。"
            label={ISSUE_FIELD_LABELS.usableFrom}
            name={ISSUE_FORM_NAMES.usableFrom}
            onLeave={leave("usableFrom")}
            onValueChange={change("usableFrom")}
            required={false}
            type="datetime-local"
            value={values.usableFrom}
            {...(messages.usableFrom === undefined ? {} : { message: messages.usableFrom })}
          />
          {values.usableFrom === "" ? null : (
            <div>
              <Button onClick={clearUsableFrom} size="sm" type="button" variant="ghost">
                利用開始を空欄に戻す
              </Button>
            </div>
          )}
        </div>
        <AdminTextField
          controlId={`${idPrefix}minPurchaseAmount`}
          description="この額以上の購入でだけ使えます。空欄なら額を問いません。"
          inputMode="decimal"
          label={`${ISSUE_FIELD_LABELS.minPurchaseAmount}（ドル）`}
          name={ISSUE_FORM_NAMES.minPurchaseAmount}
          onLeave={leave("minPurchaseAmount")}
          onValueChange={change("minPurchaseAmount")}
          required={false}
          type="text"
          value={values.minPurchaseAmount}
          {...(messages.minPurchaseAmount === undefined
            ? {}
            : { message: messages.minPurchaseAmount })}
        />
      </div>
    </fieldset>
  );
}
