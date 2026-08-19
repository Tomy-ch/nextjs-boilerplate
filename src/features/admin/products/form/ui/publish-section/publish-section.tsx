"use client";

import { useCallback, useRef } from "react";

import { Button } from "@/components/design-system/action/button/button";
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
 *
 * 未公開へ戻す操作を別に置きます。`datetime-local` は年・月・日・時・分がそれぞれ独立した区画で、
 * 空へ戻すには区画の数だけ消す操作が要ります。「公開をやめる」という 1 つの意図に対して操作が
 * 複数回要るのは、意図と操作の粒度が合っていません。
 */
export function ProductPublishSection({
  defaults,
  fieldErrors,
  idPrefix,
  statusOptions,
}: ProductPublishSectionProps) {
  const publishedAtRef = useRef<HTMLDivElement>(null);

  const unpublish = useCallback(() => {
    const input = publishedAtRef.current?.querySelector("input");

    if (input === null || input === undefined) return;

    input.value = "";
    // 値を直に書いても form へは伝わるが、確認の段が読む合図は出ない。同じ経路へ載せる。
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, []);

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
      <div className="grid gap-2" ref={publishedAtRef}>
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
        <div>
          <Button onClick={unpublish} size="sm" type="button" variant="outline">
            非公開にする
          </Button>
        </div>
      </div>
    </div>
  );
}
