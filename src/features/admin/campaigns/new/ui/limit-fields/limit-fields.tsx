"use client";

import { useCallback, useId } from "react";

import { AdminTextField } from "../../../../ui/text-field/text-field";
import type { CampaignOwnValues } from "../../campaign-rules";
import { CAMPAIGN_FORM_NAMES } from "../../form-names";
import { CAMPAIGN_FIELD_LABELS } from "../../form-state";

/** この欄が受け持つ項目。 */
export type CampaignLimitField = "totalLimit" | "perUserLimit" | "minPurchaseAmount";

/** `CampaignLimitFields` の props。 */
export type CampaignLimitFieldsProps = {
  /** 打たれている値。 */
  values: Pick<CampaignOwnValues, CampaignLimitField>;
  /** 1 項目を書き換える。 */
  onValueChange: (field: CampaignLimitField, value: string) => void;
  /** 入力欄から focus が外れたことを伝える。 */
  onLeave: (field: CampaignLimitField) => void;
  /** 項目ごとの誤りの文言。 */
  messages: Readonly<Partial<Record<CampaignLimitField, string>>>;
};

/**
 * 配れる枚数と、配るクーポンを使うのに要る購入額を決める欄。
 *
 * @remarks
 * 枚数は数値型の入力欄で受けます。整数で、範囲の端も宣言できるためです。最低購入額は値引き額と
 * 同じくドルで受け、数値型にしません（decimal を数値として持たない）。
 *
 * @param props - 打たれている値と、その変更・離脱の通知、項目ごとの誤りの文言。
 *
 * @see Storybook `Features/Admin/Campaigns/New/LimitFields`
 */
export function CampaignLimitFields({
  messages,
  onLeave,
  onValueChange,
  values,
}: CampaignLimitFieldsProps) {
  const idPrefix = useId();

  const change = useCallback(
    (field: CampaignLimitField) => (value: string) => onValueChange(field, value),
    [onValueChange],
  );
  const leave = useCallback((field: CampaignLimitField) => () => onLeave(field), [onLeave]);

  return (
    <fieldset className="grid gap-4">
      <legend className="mb-2 font-emphasis text-base">上限と条件</legend>
      <div className="grid gap-4 sm:grid-cols-3 sm:items-start">
        {(["totalLimit", "perUserLimit"] as const).map((name) => (
          <AdminTextField
            controlId={`${idPrefix}${name}`}
            description={
              name === "totalLimit"
                ? "配れるクーポンの総数です。"
                : "1 人が受け取れる枚数です。総枚数以下にします。"
            }
            inputMode="numeric"
            key={name}
            label={CAMPAIGN_FIELD_LABELS[name]}
            min={1}
            name={CAMPAIGN_FORM_NAMES[name]}
            onLeave={leave(name)}
            onValueChange={change(name)}
            required={true}
            step={1}
            type="number"
            value={values[name]}
            {...(messages[name] === undefined ? {} : { message: messages[name] })}
          />
        ))}
        <AdminTextField
          controlId={`${idPrefix}minPurchaseAmount`}
          description="この額以上の購入でだけ使えます。空欄なら額を問いません。"
          inputMode="decimal"
          label={`${CAMPAIGN_FIELD_LABELS.minPurchaseAmount}（ドル）`}
          name={CAMPAIGN_FORM_NAMES.minPurchaseAmount}
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
