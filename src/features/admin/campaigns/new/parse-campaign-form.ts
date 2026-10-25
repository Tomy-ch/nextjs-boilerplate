import { z } from "zod";

import type { FieldErrors } from "@/model/action-state";
import type { CampaignDraft } from "@/model/campaign/campaign-draft";
import { IDEMPOTENCY_KEY_FIELD } from "@/model/idempotency-key";

import { readCouponDiscountValues } from "../../coupon-discount";
import { type CampaignOwnValues, toCampaignDraft } from "./campaign-rules";
import { readCouponScopeValues } from "./coupon-scope";
import { CAMPAIGN_CONFIRMED_VALUE, CAMPAIGN_FORM_NAMES } from "./form-names";
import { CAMPAIGN_TARGET_LOST_MESSAGE, type CreateCampaignField } from "./form-state";

/** 送信を読んだ結果。 */
export type CampaignFormParseResult =
  | {
      readonly ok: true;
      readonly draft: CampaignDraft;
      readonly idempotencyKey: string;
    }
  | {
      readonly ok: false;
      readonly formError: string | null;
      readonly fieldErrors?: FieldErrors<CreateCampaignField>;
    };

/**
 * 送信された値を文字列として取り出す。
 *
 * @param formData - 送信された form の値
 * @param name - 項目の名前
 * @returns 文字列の値。載っていないかファイルなら空文字
 */
function textOf(formData: FormData, name: string): string {
  const value = formData.get(name);

  return typeof value === "string" ? value : "";
}

/**
 * 送られてきたキャンペーンの定義を読む。
 *
 * @remarks
 * **確認を通った合図が無い送信は受けません。** 画面は確認を挟んでから送りますが、送信先は画面を
 * 経ずに呼べます。冪等キーと合図のどちらが欠けても、入力した人が直せるものではないため、
 * 開き直してもらう文言にまとめます。
 *
 * 日時は画面が確定させた瞬間の文字列として運ばれてきます。ここで時間帯を解き直しません。
 *
 * @param formData - 送信された form の値
 * @returns 読めた結果。読めなければ `ok: false` にエラーの内訳を添えて返す
 */
export function parseCampaignForm(formData: FormData): CampaignFormParseResult {
  const idempotencyKey = z.uuid().safeParse(formData.get(IDEMPOTENCY_KEY_FIELD));
  const confirmed = textOf(formData, CAMPAIGN_FORM_NAMES.confirmed) === CAMPAIGN_CONFIRMED_VALUE;

  if (!idempotencyKey.success || !confirmed) {
    return { ok: false, formError: CAMPAIGN_TARGET_LOST_MESSAGE };
  }

  const own: CampaignOwnValues = {
    code: textOf(formData, CAMPAIGN_FORM_NAMES.code),
    startsAt: textOf(formData, CAMPAIGN_FORM_NAMES.startsAt),
    endsAt: textOf(formData, CAMPAIGN_FORM_NAMES.endsAt),
    couponExpiresAt: textOf(formData, CAMPAIGN_FORM_NAMES.couponExpiresAt),
    usableFrom: textOf(formData, CAMPAIGN_FORM_NAMES.usableFrom),
    totalLimit: textOf(formData, CAMPAIGN_FORM_NAMES.totalLimit),
    perUserLimit: textOf(formData, CAMPAIGN_FORM_NAMES.perUserLimit),
    minPurchaseAmount: textOf(formData, CAMPAIGN_FORM_NAMES.minPurchaseAmount),
  };
  const reading = toCampaignDraft({
    own,
    discount: readCouponDiscountValues(formData),
    scope: readCouponScopeValues(formData),
  });

  if (!reading.ok) {
    const fieldErrors: FieldErrors<CreateCampaignField> = Object.fromEntries(
      Object.entries(reading.errors).map(([field, message]) => [field, [message]]),
    );

    return { ok: false, formError: null, fieldErrors };
  }

  return { ok: true, draft: reading.draft, idempotencyKey: idempotencyKey.data };
}
