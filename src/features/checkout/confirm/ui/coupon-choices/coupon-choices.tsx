"use client";

import { createContext, type ReactNode, useCallback, useContext, useId } from "react";

import { FieldError } from "@/components/design-system/form/field/field";
import { Label } from "@/components/design-system/form/label/label";
import {
  RadioGroupNative,
  RadioGroupNativeItem,
} from "@/components/design-system/form/radio-group-native/radio-group-native";
import type { CouponId } from "@/model/coupon/coupon";

import { usePlaceOrderState } from "../place-order-state/place-order-state";

const ChoicesScopeContext = createContext<string | null>(null);

/** {@link CouponChoices} の props。 */
export type CouponChoicesProps = {
  /** 欄の見出し。 */
  title: string;
  /** 候補 1 枚ずつの {@link CouponChoice}。 */
  children: ReactNode;
};

/**
 * クーポンの欄のうち、選ぶ操作と拒否の表示を受け持つ radio の群。
 *
 * @remarks
 * 「使わない」を先頭に置き、最初はどれも選んでいません。radio は一度選ぶと外せないため、使わない
 * という選択肢が無いと、一度選んだ利用者は元に戻れません。選んだ時点で反映し、「適用」の操作は
 * 置きません。
 *
 * 選択は確定の送信状態と同じ器（`../place-order-state`）が持ちます。
 *
 * @param props - {@link CouponChoicesProps}。
 */
export function CouponChoices({ title, children }: CouponChoicesProps) {
  "use memo";

  const scope = useId();
  const errorId = `${scope}-error`;
  const { couponErrors } = usePlaceOrderState();
  const invalid = couponErrors !== undefined;

  return (
    <ChoicesScopeContext.Provider value={scope}>
      <RadioGroupNative
        aria-describedby={invalid ? errorId : undefined}
        aria-invalid={invalid || undefined}
        role="radiogroup"
      >
        <legend className="mb-3 font-emphasis leading-none">{title}</legend>
        <CouponChoice couponId={null}>使わない</CouponChoice>
        {children}
      </RadioGroupNative>
      {invalid ? <FieldError id={errorId}>{couponErrors.join(" ")}</FieldError> : null}
    </ChoicesScopeContext.Provider>
  );
}

/** {@link CouponChoice} の props。 */
export type CouponChoiceProps = {
  /** 選んだときに確定へ載せるクーポン。「使わない」は null。 */
  couponId: CouponId | null;
  /** 選択肢として見せる中身。 */
  children: ReactNode;
};

/**
 * クーポンの選択肢 1 つ。
 *
 * @remarks
 * {@link CouponChoices} の中にしか置けません。radio の `name` と `id` は、その群が配る範囲から
 * 作ります。
 *
 * @param props - {@link CouponChoiceProps}。
 * @throws CouponChoices の外で描かれたとき
 */
export function CouponChoice({ couponId, children }: CouponChoiceProps) {
  "use memo";

  const scope = useContext(ChoicesScopeContext);
  const { couponId: chosen, couponSelection, selectCoupon } = usePlaceOrderState();
  const select = useCallback(() => {
    selectCoupon(couponId);
  }, [selectCoupon, couponId]);

  if (scope === null) {
    throw new Error("CouponChoices の外にクーポンの選択肢を置こうとしました");
  }

  const id = `${scope}-${couponId ?? "none"}`;
  const checked = couponId === null ? couponSelection === null : chosen === couponId;

  return (
    <Label className="items-start font-normal" htmlFor={id}>
      <RadioGroupNativeItem
        checked={checked}
        className="mt-0.5"
        id={id}
        name={scope}
        onChange={select}
      />
      {children}
    </Label>
  );
}
