"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useId,
  useSyncExternalStore,
} from "react";

import { Card, CardContent } from "@/components/design-system/display/card/card";
import { FieldError } from "@/components/design-system/form/field/field";
import { Label } from "@/components/design-system/form/label/label";
import {
  RadioGroupNative,
  RadioGroupNativeItem,
} from "@/components/design-system/form/radio-group-native/radio-group-native";
import type { CouponId } from "@/model/coupon/coupon";

import { usePlaceOrderState } from "../place-order-state/place-order-state";

const ChoicesScopeContext = createContext<string | null>(null);

const LOCKED_MESSAGE =
  "前回の確定の結果が分かるまで、クーポンは選び直せません。同じ内容でもう一度確定してください。";
const NO_SCRIPT_MESSAGE =
  "JavaScript が無効のときはクーポンを選べません。クーポンを使わない注文はできます。";

/**
 * 購読するものを持たない。
 *
 * @returns 何もしない解除関数
 */
function subscribeToNothing(): () => void {
  return () => undefined;
}

/**
 * client で読む値。hydration を終えている。
 *
 * @returns 常に true
 */
function readHydrated(): boolean {
  return true;
}

/**
 * server 描画と hydration 中の値。
 *
 * @returns 常に false
 */
function readNotHydrated(): boolean {
  return false;
}

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
 * 送信中と、直前の確定の結果が定まらないあいだは選び直せません。止めるのは器の `selectCoupon` で、
 * ここは `disabled` にせず `aria-disabled` で示します。結果が定まらないあいだだけ、同じ内容で確定し
 * 直す案内を欄の説明に結びます（理由は `model/idempotency-key.ts` の `leavesOutcomeOpen`）。
 * hydration を終えるまでは `disabled` です。それまでの選択は確定に載りません（`../../../README.md`）。
 *
 * @param props - {@link CouponChoicesProps}。
 */
export function CouponChoices({ title, children }: CouponChoicesProps) {
  "use memo";

  const scope = useId();
  const errorId = `${scope}-error`;
  const lockedId = `${scope}-locked`;
  const hydrated = useSyncExternalStore(subscribeToNothing, readHydrated, readNotHydrated);
  const { couponErrors, couponLocked, outcomeOpen } = usePlaceOrderState();
  const invalid = couponErrors !== undefined;
  const describedBy = [outcomeOpen ? lockedId : null, invalid ? errorId : null]
    .filter((id) => id !== null)
    .join(" ");

  return (
    <ChoicesScopeContext.Provider value={scope}>
      <RadioGroupNative
        aria-describedby={describedBy === "" ? undefined : describedBy}
        aria-disabled={couponLocked || undefined}
        aria-invalid={invalid || undefined}
        disabled={!hydrated}
        role="radiogroup"
      >
        <legend className="mb-3 font-emphasis leading-none">{title}</legend>
        <CouponChoice couponId={null}>使わない</CouponChoice>
        {children}
      </RadioGroupNative>
      <noscript>
        <p className="text-muted-foreground text-sm">{NO_SCRIPT_MESSAGE}</p>
      </noscript>
      {outcomeOpen ? (
        <p className="text-muted-foreground text-sm" id={lockedId}>
          {LOCKED_MESSAGE}
        </p>
      ) : null}
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
  const { couponId: chosen, couponSelection, selectCoupon, couponLocked } = usePlaceOrderState();
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
        aria-disabled={couponLocked || undefined}
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

/** {@link CouponLockedNotice} の props。 */
export type CouponLockedNoticeProps = {
  /** 欄の見出し。 */
  title: string;
};

/**
 * 直前の確定の結果が定まらないあいだだけ出す、クーポンを選び直せない案内。
 *
 * @remarks
 * 候補が取り直されて 0 件になっても、結果が定まらないあいだは選んでいたクーポンが送信に載り続け
 * ます。欄ごと消すと、載っている理由が画面から消えます。
 *
 * @param props - {@link CouponLockedNoticeProps}。
 */
export function CouponLockedNotice({ title }: CouponLockedNoticeProps) {
  const { outcomeOpen } = usePlaceOrderState();

  if (!outcomeOpen) {
    return null;
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        <h2 className="font-emphasis leading-none">{title}</h2>
        <p className="text-muted-foreground text-sm">{LOCKED_MESSAGE}</p>
      </CardContent>
    </Card>
  );
}
