"use client";

import type { FieldErrors } from "@/model/action-state";

import type { ProductFormField } from "../../form-state";
import { PRODUCT_FORM_NAMES } from "../../parse-product-form";
import type { ProductSelectOption } from "../select-field/select-field";
import { ProductSelectField } from "../select-field/select-field";
import { ProductTextField } from "../text-field/text-field";

/** `ProductPublishSection` の props。 */
export type ProductPublishSectionProps = {
  /** 入力欄の `id` の前置き。 */
  idPrefix: string;
  /** 選べる状態。 */
  statusOptions: readonly ProductSelectOption[];
  /** 直前の送信で見つかった、項目ごとの誤り。 */
  fieldErrors?: FieldErrors<ProductFormField>;
  /** 最初に入っている値。 */
  defaults?: {
    readonly statusId?: string;
    readonly publishedAt?: Date | null;
  };
};

/** `datetime-local` が受け取る形へ写す。秒より下は扱わない。 */
function toLocalInputValue(value: Date | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;

  const offset = value.getTimezoneOffset() * 60_000;

  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
}

/**
 * 公開の扱い。
 *
 * @remarks
 * 状態と公開日時を同じ段に置きます。どちらも「この商品を今どう扱うか」を決めるもので、片方だけを
 * 見て決められません。
 *
 * **状態は在庫・販売の状態であり、公開の可否とは別の軸です。** 公開されるかどうかは公開日時が
 * 決めます。
 */
export function ProductPublishSection({
  defaults,
  fieldErrors,
  idPrefix,
  statusOptions,
}: ProductPublishSectionProps) {
  return (
    <div className="grid gap-6">
      <ProductSelectField
        controlId={`${idPrefix}-status`}
        defaultValue={defaults?.statusId}
        label="状態"
        message={fieldErrors?.statusId?.[0]}
        name={PRODUCT_FORM_NAMES.statusId}
        options={statusOptions}
      />
      <ProductTextField
        controlId={`${idPrefix}-published-at`}
        defaultValue={toLocalInputValue(defaults?.publishedAt)}
        description="空欄のままにすると未公開です。"
        label="公開日時"
        message={fieldErrors?.publishedAt?.[0]}
        name={PRODUCT_FORM_NAMES.publishedAt}
        required={false}
        type="datetime-local"
      />
    </div>
  );
}
