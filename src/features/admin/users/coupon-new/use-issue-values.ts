"use client";

import { useCallback, useMemo, useState } from "react";

import { type CouponDiscountValues, EMPTY_COUPON_DISCOUNT_VALUES } from "../../coupon-discount";
import { type CouponScopeValues, EMPTY_COUPON_SCOPE_VALUES } from "../../coupon-scope";
import type { IssueCouponField, IssueOwnField } from "./form-state";
import {
  EMPTY_ISSUE_OWN_VALUES,
  type IssueOwnValues,
  submissionOf,
  toCouponIssueDraft,
} from "./issue-rules";

export type IssueFormValues = {
  readonly own: IssueOwnValues;
  readonly discount: CouponDiscountValues;
  readonly scope: CouponScopeValues;
  /** 触れた欄の誤り。確認を開こうとしたあとは全部の欄。 */
  readonly errors: Readonly<Partial<Record<IssueCouponField, string>>>;
  /** 何か打たれていれば true。離れるときの確認に使う。 */
  readonly dirty: boolean;
  readonly setOwn: (field: IssueOwnField, value: string) => void;
  readonly setDiscount: (values: CouponDiscountValues) => void;
  readonly setScope: (values: CouponScopeValues) => void;
  readonly touch: (field: IssueCouponField) => void;
  /** 全部の欄の誤りを見せる。誤りが無ければ true を返す。 */
  readonly touchAll: () => boolean;
  /** 値と触れた印を空へ戻す。 */
  readonly reset: () => void;
};

/**
 * 発行の画面で打たれている値と、欄ごとの誤りを持つ。
 *
 * @remarks
 * 誤りは触れた欄にだけ出します。開いた直後から赤いフォームは、まだ何もしていない人を責めます。
 * 判定は送る前と受け取った後で同じものを通ります。
 *
 * @returns 値と、それを変える操作
 */
export function useIssueValues(): IssueFormValues {
  const [ownValues, setOwnValues] = useState(EMPTY_ISSUE_OWN_VALUES);
  const [discountValues, setDiscountValues] = useState(EMPTY_COUPON_DISCOUNT_VALUES);
  const [scopeValues, setScopeValues] = useState(EMPTY_COUPON_SCOPE_VALUES);
  const [touched, setTouched] = useState<ReadonlySet<IssueCouponField> | "all">(new Set());

  const touch = useCallback((field: IssueCouponField) => {
    setTouched((current) => (current === "all" ? current : new Set(current).add(field)));
  }, []);

  const setOwn = useCallback((field: IssueOwnField, value: string) => {
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

  const failures = useMemo(() => {
    const reading = toCouponIssueDraft(submissionOf(ownValues, discountValues, scopeValues));

    return reading.ok ? {} : reading.errors;
  }, [discountValues, ownValues, scopeValues]);

  const errors = useMemo(() => {
    if (touched === "all") return failures;

    const shown: Partial<Record<IssueCouponField, string>> = {};

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
    setOwnValues(EMPTY_ISSUE_OWN_VALUES);
    setDiscountValues(EMPTY_COUPON_DISCOUNT_VALUES);
    setScopeValues(EMPTY_COUPON_SCOPE_VALUES);
    setTouched(new Set());
  }, []);

  const dirty =
    ownValues !== EMPTY_ISSUE_OWN_VALUES ||
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
