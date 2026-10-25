"use client";

import { useCallback, useMemo, useState } from "react";

import {
  type CouponDiscountField,
  type CouponDiscountValues,
  EMPTY_COUPON_DISCOUNT_VALUES,
} from "./coupon-discount";
import {
  type CouponScopeField,
  type CouponScopeValues,
  EMPTY_COUPON_SCOPE_VALUES,
} from "./coupon-scope";

/**
 * クーポンを組むフォームで、入力した人が直せる欄。
 *
 * @typeParam TOwnField - 画面が自前で持つ欄
 */
export type CouponFormField<TOwnField extends string> =
  | TOwnField
  | CouponDiscountField
  | CouponScopeField;

/**
 * 欄ごとの誤りの文言。
 *
 * @typeParam TOwnField - 画面が自前で持つ欄
 */
type CouponFormErrors<TOwnField extends string> = Readonly<
  Partial<Record<CouponFormField<TOwnField>, string>>
>;

/**
 * 打たれている値を判定に掛けた結果。通ったかと、通らなければ欄ごとの文言だけを見る。
 *
 * @typeParam TOwnField - 画面が自前で持つ欄
 */
type CouponFormReading<TOwnField extends string> =
  | { readonly ok: true }
  | { readonly ok: false; readonly errors: CouponFormErrors<TOwnField> };

/**
 * 打たれている値を判定に掛ける関数。
 *
 * @typeParam TOwnField - 画面が自前で持つ欄
 */
export type CouponFormRead<TOwnField extends string> = (
  own: Readonly<Record<TOwnField, string>>,
  discount: CouponDiscountValues,
  scope: CouponScopeValues,
) => CouponFormReading<TOwnField>;

/**
 * クーポンを組むフォームが持つ入力の状態と、その操作。
 *
 * @typeParam TOwnField - 画面が自前で持つ欄
 */
export type CouponFormValues<TOwnField extends string> = {
  /** 画面が自前で持つ欄の今の値。 */
  readonly own: Readonly<Record<TOwnField, string>>;
  /** 値引きの今の値。 */
  readonly discount: CouponDiscountValues;
  /** 範囲の今の値。 */
  readonly scope: CouponScopeValues;
  /** 判定の誤り。触れた欄のぶんだけ返す。確認を開こうとしたあとは全部の欄。 */
  readonly errors: CouponFormErrors<TOwnField>;
  /** 最初の値から変わっているか。離れるときの確認に使う。 */
  readonly dirty: boolean;
  /** 画面が自前で持つ 1 欄を書き換える。 */
  readonly setOwn: (field: TOwnField, value: string) => void;
  /** 値引きを書き換える。選び直しで決まる種別は、選んだ時点で触れたものとする。 */
  readonly setDiscount: (values: CouponDiscountValues) => void;
  /** 範囲を書き換える。選び直しで決まる項目は、選んだ時点で触れたものとする。 */
  readonly setScope: (values: CouponScopeValues) => void;
  /** 1 欄を「触れた」ものとして印を付ける。 */
  readonly touch: (field: CouponFormField<TOwnField>) => void;
  /**
   * すべての欄に印を付け、判定が通るかを返す。
   *
   * @returns 誤りが無ければ true
   */
  readonly touchAll: () => boolean;
  /** 値と触れた印を空へ戻す。 */
  readonly reset: () => void;
};

/**
 * 値引きと範囲を共有の部品で持ち、残りを画面が持つフォームの、打たれている値と欄ごとの誤りを持つ。
 *
 * @remarks
 * 誤りは触れた欄にだけ出します。開いた直後から赤いフォームは、まだ何もしていない人を責めます。
 * 判定は値が変わるたびに掛け直すため、触れた欄は直した時点で誤りが消えます。
 *
 * `emptyOwn` と `read` は描画をまたいで同じ参照を渡します。`dirty` は `emptyOwn` との参照の一致で
 * 測り、判定は `read` が変わるたびに掛け直します。
 *
 * @typeParam TOwnField - 画面が自前で持つ欄
 * @param emptyOwn - 画面が自前で持つ欄の、まだ何も打っていない値
 * @param read - 打たれている値を判定に掛ける関数
 * @returns 値と、それを変える操作
 */
export function useCouponFormValues<TOwnField extends string>(
  emptyOwn: Readonly<Record<TOwnField, string>>,
  read: CouponFormRead<TOwnField>,
): CouponFormValues<TOwnField> {
  const [ownValues, setOwnValues] = useState(emptyOwn);
  const [discountValues, setDiscountValues] = useState(EMPTY_COUPON_DISCOUNT_VALUES);
  const [scopeValues, setScopeValues] = useState(EMPTY_COUPON_SCOPE_VALUES);
  const [touched, setTouched] = useState<ReadonlySet<CouponFormField<TOwnField>> | "all">(
    new Set(),
  );

  const touch = useCallback((field: CouponFormField<TOwnField>) => {
    setTouched((current) => (current === "all" ? current : new Set(current).add(field)));
  }, []);

  const setOwn = useCallback((field: TOwnField, value: string) => {
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
      if (values.categoryId !== scopeValues.categoryId) touch("scopeCategoryId");
      if (values.productId !== scopeValues.productId) touch("scopeProductId");

      setScopeValues(values);
      touch("scopeKind");
    },
    [scopeValues, touch],
  );

  const failures = useMemo((): CouponFormErrors<TOwnField> => {
    const reading = read(ownValues, discountValues, scopeValues);
    const none: Partial<Record<CouponFormField<TOwnField>, string>> = {};

    return reading.ok ? none : reading.errors;
  }, [discountValues, ownValues, read, scopeValues]);

  const errors = useMemo((): CouponFormErrors<TOwnField> => {
    if (touched === "all") return failures;

    const shown: Partial<Record<CouponFormField<TOwnField>, string>> = {};

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

  const reset = useCallback(() => {
    setOwnValues(emptyOwn);
    setDiscountValues(EMPTY_COUPON_DISCOUNT_VALUES);
    setScopeValues(EMPTY_COUPON_SCOPE_VALUES);
    setTouched(new Set());
  }, [emptyOwn]);

  const dirty =
    ownValues !== emptyOwn ||
    discountValues !== EMPTY_COUPON_DISCOUNT_VALUES ||
    scopeValues !== EMPTY_COUPON_SCOPE_VALUES;

  return {
    own: ownValues,
    discount: discountValues,
    scope: scopeValues,
    errors,
    dirty,
    setOwn,
    setDiscount,
    setScope,
    touch,
    touchAll,
    reset,
  };
}
