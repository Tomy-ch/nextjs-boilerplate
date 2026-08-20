"use client";

import { useCallback } from "react";

import { Button } from "@/components/design-system/action/button/button";

import { PRODUCT_FORM_NAMES } from "../../parse-product-form";
import type { ProductFormValues } from "../../use-product-values";
import type { ProductSelectOption } from "../select-field/select-field";
import { ProductSelectField } from "../select-field/select-field";
import { ProductTextField } from "../text-field/text-field";

/** `ProductPublishSection` の props。 */
export type ProductPublishSectionProps = {
  /** 入力欄の `id` の前置き。 */
  idPrefix: string;
  /** 選べる状態。 */
  statusOptions: readonly ProductSelectOption[];
  /** 入力の状態と操作。 */
  form: ProductFormValues;
};

/**
 * 公開の扱い。
 *
 * @remarks
 * 状態と公開日時を同じ段に置きます。どちらも「この商品を今どう扱うか」を決めるもので、片方だけを
 * 見て決められません。
 *
 * **状態は在庫・販売の状態であり、公開の可否とは別の軸です。** 公開されるかどうかは公開日時が
 * 決めます。
 *
 * 未公開へ戻す操作を別に置きます。`datetime-local` は年・月・日・時・分がそれぞれ独立した区画で、
 * 空へ戻すには区画の数だけ消す操作が要ります。「公開をやめる」という 1 つの意図に対して操作が
 * 複数回要るのは、意図と操作の粒度が合っていません。
 */
export function ProductPublishSection({
  form,
  idPrefix,
  statusOptions,
}: ProductPublishSectionProps) {
  const { errors, setValue, touch, values } = form;

  const changeStatus = useCallback(
    (value: string) => {
      setValue("statusId", value);
      touch("statusId");
    },
    [setValue, touch],
  );
  const changePublishedAt = useCallback(
    (value: string) => setValue("publishedAt", value),
    [setValue],
  );
  const leavePublishedAt = useCallback(() => touch("publishedAt"), [touch]);
  const unpublish = useCallback(() => setValue("publishedAt", ""), [setValue]);

  return (
    <div className="grid gap-6">
      <ProductSelectField
        controlId={`${idPrefix}-status`}
        label="状態"
        message={errors.statusId?.[0]}
        name={PRODUCT_FORM_NAMES.statusId}
        onValueChange={changeStatus}
        options={statusOptions}
        value={values.statusId}
      />
      <div className="grid gap-2">
        <ProductTextField
          controlId={`${idPrefix}-published-at`}
          description="空欄のままにすると未公開です。"
          label="公開日時"
          message={errors.publishedAt?.[0]}
          name={PRODUCT_FORM_NAMES.publishedAt}
          onLeave={leavePublishedAt}
          onValueChange={changePublishedAt}
          required={false}
          type="datetime-local"
          value={values.publishedAt}
        />
        <div>
          <Button
            disabled={values.publishedAt === ""}
            onClick={unpublish}
            size="sm"
            type="button"
            variant="outline"
          >
            非公開にする
          </Button>
        </div>
      </div>
    </div>
  );
}
