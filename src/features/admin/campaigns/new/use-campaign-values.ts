"use client";

import { useCallback, useMemo, useState } from "react";

import { type CouponDiscountValues, EMPTY_COUPON_DISCOUNT_VALUES } from "../../coupon-discount";
import {
  type CampaignOwnValues,
  EMPTY_CAMPAIGN_OWN_VALUES,
  submissionOf,
  toCampaignDraft,
} from "./campaign-rules";
import { type CouponScopeValues, EMPTY_COUPON_SCOPE_VALUES } from "./coupon-scope";
import type { CampaignOwnField, CreateCampaignField } from "./form-state";

/** 画面が持つ入力の状態と、その操作。 */
export type CampaignFormValues = {
  /** キャンペーン自身の項目の今の値。 */
  readonly own: CampaignOwnValues;
  /** 値引きの今の値。 */
  readonly discount: CouponDiscountValues;
  /** 範囲の今の値。 */
  readonly scope: CouponScopeValues;
  /** 判定の誤り。触れた項目のぶんだけ返す。 */
  readonly errors: Readonly<Partial<Record<CreateCampaignField, string>>>;
  /** 最初の値から変わっているか。 */
  readonly dirty: boolean;
  /** キャンペーン自身の 1 項目を書き換える。 */
  readonly setOwn: (field: CampaignOwnField, value: string) => void;
  /** 値引きを書き換える。選び直しで決まる種別は、選んだ時点で触れたものとする。 */
  readonly setDiscount: (values: CouponDiscountValues) => void;
  /** 範囲を書き換える。選び直しで決まる項目は、選んだ時点で触れたものとする。 */
  readonly setScope: (values: CouponScopeValues) => void;
  /** 1 項目を「触れた」ものとして印を付ける。 */
  readonly touch: (field: CreateCampaignField) => void;
  /**
   * すべての項目に印を付け、判定が通るかを返す。
   *
   * @returns 誤りが無ければ true
   */
  readonly touchAll: () => boolean;
};

/**
 * 入力の値を画面が持つ。
 *
 * @remarks
 * **入力欄に任せず state で持ちます。** 確認の面が送るときに載せ直すためと、弾かれた送信のあとも
 * 書きかけを残すためです。
 *
 * 誤りは**触れた項目だけ**返します（[`admin` の README](../../README.md)）。
 * 判定は値が変わるたびに掛け直すため、触れた項目は直した時点で誤りが消えます。関係の誤り
 * （配布終了が開始より前、など）は相手の項目を直しても消えます。確認を開く操作は
 * {@link CampaignFormValues.touchAll} で全項目に印を付け、残っている誤りをまとめて出します。
 *
 * 規則は [`campaign-rules`](./campaign-rules.ts) が持ち、受け取る側の Server Action も同じものを
 * 通ります。
 *
 * @returns 画面が持つ入力の状態と、その操作
 */
export function useCampaignValues(): CampaignFormValues {
  const [own, setOwnValues] = useState(EMPTY_CAMPAIGN_OWN_VALUES);
  const [discount, setDiscountValues] = useState(EMPTY_COUPON_DISCOUNT_VALUES);
  const [scope, setScopeValues] = useState(EMPTY_COUPON_SCOPE_VALUES);
  const [touched, setTouched] = useState<ReadonlySet<CreateCampaignField> | "all">(new Set());

  const touch = useCallback((field: CreateCampaignField) => {
    setTouched((current) => (current === "all" ? current : new Set(current).add(field)));
  }, []);

  const setOwn = useCallback((field: CampaignOwnField, value: string) => {
    setOwnValues((current) => ({ ...current, [field]: value }));
  }, []);

  const setDiscount = useCallback(
    (values: CouponDiscountValues) => {
      setDiscountValues(values);
      touch("discountKind");
    },
    [touch],
  );

  const setScope = useCallback(
    (values: CouponScopeValues) => {
      if (values.categoryId !== scope.categoryId) touch("scopeCategoryId");
      if (values.productId !== scope.productId) touch("scopeProductId");

      setScopeValues(values);
      touch("scopeKind");
    },
    [scope, touch],
  );

  const failures = useMemo(() => {
    const reading = toCampaignDraft(submissionOf(own, discount, scope));

    return reading.ok ? {} : reading.errors;
  }, [discount, own, scope]);

  const errors = useMemo(() => {
    if (touched === "all") return failures;

    const shown: Partial<Record<CreateCampaignField, string>> = {};

    for (const field of touched) {
      const message = failures[field];

      if (message !== undefined) shown[field] = message;
    }

    return shown;
  }, [failures, touched]);

  const touchAll = useCallback(() => {
    setTouched("all");

    return Object.keys(failures).length === 0;
  }, [failures]);

  const dirty =
    own !== EMPTY_CAMPAIGN_OWN_VALUES ||
    discount !== EMPTY_COUPON_DISCOUNT_VALUES ||
    scope !== EMPTY_COUPON_SCOPE_VALUES;

  return { own, discount, scope, errors, dirty, setOwn, setDiscount, setScope, touch, touchAll };
}
