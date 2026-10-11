import { z } from "zod";

import type { FieldErrors } from "@/model/action-state";
import { IDEMPOTENCY_KEY_FIELD } from "@/model/idempotency-key";
import type { ProductDiscontinueConditions, ProductId } from "@/model/product/product";
import { toProductId } from "@/model/product/product";

import {
  COUPON_DISCOUNT_RATE_INVALID_MESSAGE,
  COUPON_VALIDITY_DAYS_INVALID_MESSAGE,
  toCouponDiscountRate,
  toCouponValidityDays,
} from "./coupon-rules";
import { DISCONTINUE_CONFIRMED_VALUE, DISCONTINUE_FORM_NAMES } from "./form-names";
import type { DiscontinueProductField } from "./form-state";
import { DISCONTINUE_TARGET_LOST_MESSAGE } from "./form-state";

/** 送信を読んだ結果。 */
export type DiscontinueFormParseResult =
  | {
      readonly ok: true;
      readonly productId: ProductId;
      readonly idempotencyKey: string;
      readonly conditions: ProductDiscontinueConditions;
    }
  | {
      readonly ok: false;
      readonly formError: string | null;
      readonly fieldErrors?: FieldErrors<DiscontinueProductField>;
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
 * 送られてきた廃番の指示を読む。
 *
 * @remarks
 * **確認を通った合図が無い送信は受けません。** 画面は確認を挟んでから送りますが、送信先は画面を
 * 経ずに呼べます。対象・冪等キー・合図のどれが欠けても、入力した人が直せるものではないため、
 * 開き直してもらう文言にまとめます。
 *
 * 条件の読み方は [`coupon-rules`](./coupon-rules.ts) が持ちます。確認を開く前の画面と同じ規則です。
 *
 * @param formData - 送信された form の値
 * @returns 読めた結果。読めなければ `ok: false` にエラーの内訳を添えて返す
 */
export function parseDiscontinueForm(formData: FormData): DiscontinueFormParseResult {
  const id = textOf(formData, DISCONTINUE_FORM_NAMES.productId);
  const idempotencyKey = z.uuid().safeParse(formData.get(IDEMPOTENCY_KEY_FIELD));
  const confirmed =
    textOf(formData, DISCONTINUE_FORM_NAMES.confirmed) === DISCONTINUE_CONFIRMED_VALUE;

  if (id === "" || !idempotencyKey.success || !confirmed) {
    return { ok: false, formError: DISCONTINUE_TARGET_LOST_MESSAGE };
  }

  const couponDiscountRate = toCouponDiscountRate(
    textOf(formData, DISCONTINUE_FORM_NAMES.couponDiscountRate),
  );
  const couponValidityDays = toCouponValidityDays(
    textOf(formData, DISCONTINUE_FORM_NAMES.couponValidityDays),
  );

  if (couponDiscountRate === null || couponValidityDays === null) {
    return {
      ok: false,
      formError: null,
      fieldErrors: {
        ...(couponDiscountRate === null
          ? { couponDiscountRate: [COUPON_DISCOUNT_RATE_INVALID_MESSAGE] }
          : {}),
        ...(couponValidityDays === null
          ? { couponValidityDays: [COUPON_VALIDITY_DAYS_INVALID_MESSAGE] }
          : {}),
      },
    };
  }

  return {
    ok: true,
    productId: toProductId(id),
    idempotencyKey: idempotencyKey.data,
    conditions: { couponDiscountRate, couponValidityDays },
  };
}
