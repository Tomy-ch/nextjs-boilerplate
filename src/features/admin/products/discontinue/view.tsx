"use client";

import Link from "next/link";
import { type ReactNode, useActionState, useCallback, useState } from "react";

import { FormFeedback } from "@/components/app-starter/form-feedback/form-feedback";
import { Button } from "@/components/design-system/action/button/button";
import { ErrorKind } from "@/errors/error-kind";
import { idleActionState } from "@/model/action-state";
import type { ProductDiscontinueImpact, ProductId } from "@/model/product/product";

import { ADMIN_PRODUCT_LIST_PATH, adminProductDiscontinuePath } from "../../paths";
import { useActionResultFreshness } from "../use-action-result-freshness";
import {
  COUPON_DISCOUNT_RATE_INVALID_MESSAGE,
  COUPON_VALIDITY_DAYS_INVALID_MESSAGE,
  toCouponDiscountRate,
  toCouponValidityDays,
} from "./coupon-rules";
import type {
  DiscontinueProductAction,
  DiscontinueProductField,
  DiscontinueProductState,
} from "./form-state";
import {
  DiscontinueConditionsFields,
  type DiscontinueConditionValues,
} from "./ui/conditions-fields/conditions-fields";
import { DiscontinueConfirmDialog } from "./ui/confirm-dialog/confirm-dialog";
import { DiscontinuedState } from "./ui/discontinued-state/discontinued-state";
import { DiscontinueImpactSummary } from "./ui/impact-summary/impact-summary";
import { DiscontinueResult } from "./ui/result/result";

/**
 * 商品が廃番に対してどこに立っているか。
 *
 * @remarks
 * 廃番の商品には見積もりを取りません。もう一度実行しても何も起きないためで、見積もりが無いことと
 * 廃番であることは同じ 1 つの事実です。
 */
export type DiscontinueStanding =
  | { readonly kind: "discontinued"; readonly discontinuedAt: Date }
  | { readonly kind: "open"; readonly impact: ProductDiscontinueImpact };

/** `AdminProductDiscontinueView` の props。 */
export type AdminProductDiscontinueViewProps = {
  /** 廃番にする商品。 */
  product: { readonly id: ProductId; readonly name: string };
  /** 読み込んだ時点の立ち位置。 */
  standing: DiscontinueStanding;
  /** 進行中の購入が残っているときに並べる区画。取得は外側が持つ。 */
  remainingPurchases: ReactNode;
  /** 廃番の送信先。 */
  discontinueAction: DiscontinueProductAction;
  /** 画面を組み立てたときに作った冪等キー。 */
  idempotencyKey: string;
};

/** まだ何も打っていない条件。既定値を置かない。 */
const EMPTY_VALUES: DiscontinueConditionValues = {
  couponDiscountRate: "",
  couponValidityDays: "",
};

/**
 * 確認を開く前に、送る前の判定を当てる。
 *
 * @param values - 打たれている条件
 * @returns 読めなかった項目ごとの文言。すべて読めれば空
 */
function checkConditions(
  values: DiscontinueConditionValues,
): Partial<Record<DiscontinueProductField, string>> {
  return {
    ...(toCouponDiscountRate(values.couponDiscountRate) === null
      ? { couponDiscountRate: COUPON_DISCOUNT_RATE_INVALID_MESSAGE }
      : {}),
    ...(toCouponValidityDays(values.couponValidityDays) === null
      ? { couponValidityDays: COUPON_VALIDITY_DAYS_INVALID_MESSAGE }
      : {}),
  };
}

/**
 * 結果が返ったときに確認を閉じるか。
 *
 * @remarks
 * 成立したときと、進行中の購入が残っていて拒まれたときに閉じます。どちらも取り直した画面から
 * 実行の入口が消えるため、開いたままにすると消えた操作の上に文言が浮きます。それ以外の失敗は
 * 確認の中に出し、押した場所から目を離させません。
 *
 * @param state - 返った結果
 * @returns 閉じるなら true
 */
function closesConfirmation(state: DiscontinueProductState): boolean {
  return (
    state.status === "success" || (state.status === "error" && state.kind === ErrorKind.CONFLICT)
  );
}

/**
 * 確認の中に出す失敗の文言。
 *
 * @param state - 返った結果
 * @returns 全体の文言と項目ごとの文言を並べたもの。失敗でなければ空
 */
function failuresOf(state: DiscontinueProductState): readonly string[] {
  if (state.status !== "error") {
    return [];
  }

  return [
    ...(state.formError === null ? [] : [state.formError]),
    ...Object.values(state.fieldErrors ?? {}).flatMap((messages) => messages ?? []),
  ];
}

/**
 * 条件の欄に出す誤りの文言。
 *
 * @remarks
 * 確認を開く前の判定を先に見ます。送信の結果は、条件を打ち直すまでのあいだだけ添えます。
 *
 * @param checked - 確認を開く前の判定が出した文言
 * @param state - 直前の送信の結果。下げられていれば null
 * @returns 項目ごとの文言
 */
function fieldMessagesOf(
  checked: Partial<Record<DiscontinueProductField, string>>,
  state: DiscontinueProductState | null,
): Partial<Record<DiscontinueProductField, string>> {
  const returned = state?.status === "error" ? (state.fieldErrors ?? {}) : {};
  const messages: Partial<Record<DiscontinueProductField, string>> = {};

  for (const field of ["couponDiscountRate", "couponValidityDays"] as const) {
    const message = checked[field] ?? returned[field]?.[0];

    if (message !== undefined) {
      messages[field] = message;
    }
  }

  return messages;
}

/**
 * 商品を廃番にする画面の、唯一の client island。
 *
 * @remarks
 * **送信の状態・冪等キー・打っている条件をここだけが持ちます。** 成立したときも拒まれたときも、
 * 送信先がこの画面を取り直させます。取り直しは props だけを差し替えるため、ここが unmount されず、
 * 結果と打った条件が残ります。3 つの立ち位置（実行できる / 進行中の購入が残っている / 既に廃番）の
 * 出し分けをこの内側で行うのはそのためで、外側で姿ごとに別の木を返すと、取り直しのたびに結果が
 * 消えます。
 *
 * 冪等キーは受け取った最初の値を持ち続けます。取り直しで新しい鍵が届いても差し替えません。
 *
 * 画面が何を約束するかは
 * [機能要件](../../../../../docs/spec/route/admin/products/[id]/discontinue/page.function.md)と[画面要件](../../../../../docs/spec/route/admin/products/[id]/discontinue/page.screen.md)。
 *
 * @see Storybook `Page/Admin/Products/Discontinue`
 */
export function AdminProductDiscontinueView({
  discontinueAction,
  idempotencyKey: initialIdempotencyKey,
  product,
  remainingPurchases,
  standing,
}: AdminProductDiscontinueViewProps) {
  const [state, formAction] = useActionState<DiscontinueProductState, FormData>(
    discontinueAction,
    idleActionState(),
  );
  const [idempotencyKey] = useState(initialIdempotencyKey);
  const [values, setValues] = useState(EMPTY_VALUES);
  const [checked, setChecked] = useState<Partial<Record<DiscontinueProductField, string>>>({});
  const [confirming, setConfirming] = useState(false);
  const { dismiss, dismissed, resultIsNew } = useActionResultFreshness(state);

  // 結果が返った描画の中で閉じる。effect にすると、閉じる前の描画が一度挟まり、取り直した画面の
  // 上に開いたままの確認が見える。
  if (resultIsNew && closesConfirmation(state)) {
    setConfirming(false);
  }

  const changeValues = useCallback(
    (next: DiscontinueConditionValues) => {
      setValues(next);
      setChecked({});
      dismiss();
    },
    [dismiss],
  );

  const openConfirmation = useCallback(() => {
    const errors = checkConditions(values);

    setChecked(errors);

    if (Object.keys(errors).length === 0) {
      dismiss();
      setConfirming(true);
    }
  }, [dismiss, values]);

  const closeConfirmation = useCallback(() => setConfirming(false), []);

  const shown = dismissed ? null : state;
  const conflicted = shown?.status === "error" && shown.kind === ErrorKind.CONFLICT;
  const reloadHref = adminProductDiscontinuePath(product.id);

  return (
    <div className="grid gap-6">
      {state.status === "success" ? <DiscontinueResult result={state.value} /> : null}

      {standing.kind === "discontinued" ? (
        <>
          <DiscontinuedState discontinuedAt={standing.discontinuedAt} />
          <div>
            <Button asChild variant="outline">
              <Link href={ADMIN_PRODUCT_LIST_PATH}>商品一覧へ戻る</Link>
            </Button>
          </div>
        </>
      ) : (
        <>
          <DiscontinueImpactSummary impact={standing.impact} reloadHref={reloadHref} />

          {conflicted && shown.formError !== null ? (
            <FormFeedback
              description={shown.formError}
              title="廃番にできませんでした"
              variant="destructive"
            />
          ) : null}

          {standing.impact.inProgressPurchaseCount > 0 ? (
            remainingPurchases
          ) : (
            <>
              <DiscontinueConditionsFields
                messages={fieldMessagesOf(checked, shown)}
                onValuesChange={changeValues}
                values={values}
              />
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={openConfirmation} type="button" variant="destructive">
                  廃番にする
                </Button>
                <Button asChild variant="ghost">
                  <Link href={ADMIN_PRODUCT_LIST_PATH}>キャンセル</Link>
                </Button>
              </div>
              <DiscontinueConfirmDialog
                estimatedUserCount={standing.impact.affectedUserCount}
                failures={shown === null || conflicted ? [] : failuresOf(shown)}
                formAction={formAction}
                idempotencyKey={idempotencyKey}
                onDismiss={closeConfirmation}
                open={confirming}
                product={product}
                values={values}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
