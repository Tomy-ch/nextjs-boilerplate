"use client";

import { useCallback, useId } from "react";

import { Button } from "@/components/design-system/action/button/button";

import { AdminTextField } from "../../../../ui/text-field/text-field";
import type { CampaignOwnValues } from "../../campaign-rules";
import { CAMPAIGN_FORM_NAMES } from "../../form-names";
import { CAMPAIGN_FIELD_LABELS } from "../../form-state";

/** この欄が受け持つ項目。 */
export type CampaignPeriodField = "startsAt" | "endsAt" | "couponExpiresAt" | "usableFrom";

/** `CampaignPeriodFields` の props。 */
export type CampaignPeriodFieldsProps = {
  /** 打たれている値。日時は `datetime-local` の壁時計の値。 */
  values: Pick<CampaignOwnValues, CampaignPeriodField>;
  /** 1 項目を書き換える。 */
  onValueChange: (field: CampaignPeriodField, value: string) => void;
  /** 入力欄から focus が外れたことを伝える。 */
  onLeave: (field: CampaignPeriodField) => void;
  /** 項目ごとの誤りの文言。 */
  messages: Readonly<Partial<Record<CampaignPeriodField, string>>>;
};

/**
 * 配布期間と、配るクーポンが使える期間を決める欄。
 *
 * @remarks
 * **日時はこの端末の時間帯で受けます。** 送る前に画面がその時間帯で瞬間へ確定させます
 * （[`campaign-rules`](../../campaign-rules.ts)）。時間帯の名前を出さないのは、サーバで描いた
 * 名前とブラウザの名前が食い違うためです。
 *
 * 利用開始は任意で、打った後に空へ戻す操作を持ちます。`datetime-local` の消し方はブラウザごとに
 * 違い、無いものもあります。
 *
 * @param props - 打たれている値と、その変更・離脱の通知、項目ごとの誤りの文言。
 *
 * @see Storybook `Features/Admin/Campaigns/New/PeriodFields`
 */
export function CampaignPeriodFields({
  messages,
  onLeave,
  onValueChange,
  values,
}: CampaignPeriodFieldsProps) {
  const idPrefix = useId();

  const change = useCallback(
    (field: CampaignPeriodField) => (value: string) => onValueChange(field, value),
    [onValueChange],
  );
  const leave = useCallback((field: CampaignPeriodField) => () => onLeave(field), [onLeave]);
  const clearUsableFrom = useCallback(() => onValueChange("usableFrom", ""), [onValueChange]);

  /**
   * 日時の 1 項目を組む。
   *
   * @param name - 組む項目
   * @param required - 必須か
   * @param description - 受け取りや利用にとってその日時が何を意味するか
   * @returns 日時の入力欄
   */
  const field = (name: CampaignPeriodField, required: boolean, description: string) => (
    <AdminTextField
      controlId={`${idPrefix}${name}`}
      label={CAMPAIGN_FIELD_LABELS[name]}
      name={CAMPAIGN_FORM_NAMES[name]}
      onLeave={leave(name)}
      onValueChange={change(name)}
      required={required}
      type="datetime-local"
      description={description}
      value={values[name]}
      {...(messages[name] === undefined ? {} : { message: messages[name] })}
    />
  );

  return (
    <fieldset className="grid gap-4">
      <legend className="mb-2 font-emphasis text-base">期間</legend>
      <p className="text-muted-foreground text-sm">日時はこの端末の時間帯で入力します。</p>
      <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
        {field("startsAt", true, "この日時から受け取れます。")}
        {field("endsAt", true, "この日時からは受け取れません。")}
        {field("couponExpiresAt", true, "配布終了より後にします。")}
        <div className="grid gap-2">
          {field("usableFrom", false, "空欄なら受け取った時点から使えます。")}
          {values.usableFrom === "" ? null : (
            <div>
              <Button onClick={clearUsableFrom} size="sm" type="button" variant="ghost">
                利用開始を空欄に戻す
              </Button>
            </div>
          )}
        </div>
      </div>
    </fieldset>
  );
}
