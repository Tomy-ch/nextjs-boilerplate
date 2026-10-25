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
  readonly errors: Readonly<Partial<Record<IssueCouponField, string>>>;
  readonly dirty: boolean;
  readonly setOwn: (field: IssueOwnField, value: string) => void;
  readonly setDiscount: (values: CouponDiscountValues) => void;
  readonly setScope: (values: CouponScopeValues) => void;
  readonly touch: (field: IssueCouponField) => void;
  readonly touchAll: () => boolean;
  readonly reset: () => void;
};

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
