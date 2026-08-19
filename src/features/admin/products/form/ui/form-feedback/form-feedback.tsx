"use client";

import type { ReactNode } from "react";

import { FormFeedback } from "@/components/app-starter/form-feedback/form-feedback";
import { FormValidationSummary } from "@/components/app-starter/form-validation-summary/form-validation-summary";

import type { ProductFormState } from "../../form-state";
import { toValidationErrors } from "../../validation-errors";

/** `ProductFormFeedback` の props。 */
export type ProductFormFeedbackProps = {
  /** 直前の送信の結果。 */
  state: ProductFormState;
  /** 入力欄の `id` の前置き。要約の link の宛先を組むのに使う。 */
  idPrefix: string;
  /** 失敗したときの見出し。 */
  title: string;
  /** 次の行動へ進む要素。 */
  children?: ReactNode;
};

/**
 * 送信の結果と、項目ごとの誤りの要約。
 *
 * @remarks
 * **要約と欄ごとの文言は両方出します。** 項目が多いフォームでは、欄のそばの文言だけでは「どこが
 * いくつ」誤っているのかを辿れません。要約は全体像と導線を、欄の文言はその場での指摘を担います。
 *
 * 送信そのものの失敗（通信・権限）は要約ではなく `FormFeedback` が扱います。直すべきものが
 * 入力の中に無いためです。
 */
export function ProductFormFeedback({
  children,
  idPrefix,
  state,
  title,
}: ProductFormFeedbackProps) {
  if (state.status !== "error") return null;

  return (
    <div className="grid gap-4">
      {state.formError === null ? null : (
        <FormFeedback description={state.formError} title={title} variant="destructive">
          {children}
        </FormFeedback>
      )}
      <FormValidationSummary errors={toValidationErrors(state.fieldErrors, idPrefix)} />
    </div>
  );
}
