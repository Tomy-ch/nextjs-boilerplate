"use client";

import type { FieldErrors } from "@/model/action-state";

import { PRODUCT_NAME_MAX_LENGTH } from "../../field-limits";
import type { ProductFormField } from "../../form-state";
import { PRODUCT_FORM_NAMES } from "../../parse-product-form";
import type { ProductSelectOption } from "../select-field/select-field";
import { ProductSelectField } from "../select-field/select-field";
import { ProductTextField } from "../text-field/text-field";

/** `ProductBasicsSection` の props。 */
export type ProductBasicsSectionProps = {
  /** 入力欄の `id` の前置き。同じ画面に 2 つ置いても衝突しないよう外から与える。 */
  idPrefix: string;
  /** 選べる分類。 */
  categoryOptions: readonly ProductSelectOption[];
  /** 直前の送信で見つかった、項目ごとの誤り。 */
  fieldErrors?: FieldErrors<ProductFormField>;
  /** 最初に入っている値。 */
  defaults?: {
    readonly name?: string;
    readonly price?: string;
    readonly stockWarningThreshold?: number | null;
    readonly categoryId?: string;
  };
  /** 在庫数を尋ねるか。作る時だけ尋ね、編集では別の口が持つ。 */
  withQuantity: boolean;
};

/**
 * 商品の基本情報。
 *
 * @remarks
 * **自分が段であることを知りません。** 表示・非表示と focus の移動は、この段を並べる器
 * （wizard / tabs）が持ちます。知ってしまうと器を差し替えられなくなります。
 *
 * 価格を数値の入力欄にしないのは、サブセントまでの十進を文字列のまま運ぶためです。数値として
 * 扱うと丸めが入り、送る前に精度が落ちます。
 */
export function ProductBasicsSection({
  categoryOptions,
  defaults,
  fieldErrors,
  idPrefix,
  withQuantity,
}: ProductBasicsSectionProps) {
  return (
    <div className="grid gap-6">
      <ProductTextField
        controlId={`${idPrefix}-name`}
        defaultValue={defaults?.name}
        description={`${PRODUCT_NAME_MAX_LENGTH} 文字までです。`}
        label="商品名"
        message={fieldErrors?.name?.[0]}
        name={PRODUCT_FORM_NAMES.name}
        required={true}
      />
      <ProductTextField
        controlId={`${idPrefix}-price`}
        defaultValue={defaults?.price}
        description="USD で入力します。小数はそのまま保たれます。"
        inputMode="decimal"
        label="価格"
        message={fieldErrors?.price?.[0]}
        name={PRODUCT_FORM_NAMES.price}
        placeholder="19.99"
        required={true}
      />
      {withQuantity ? (
        <ProductTextField
          controlId={`${idPrefix}-quantity`}
          description="登録した時点の在庫です。以降の増減は在庫の補充が持ちます。"
          inputMode="numeric"
          label="在庫数"
          message={fieldErrors?.quantity?.[0]}
          min={0}
          name={PRODUCT_FORM_NAMES.quantity}
          required={true}
          type="number"
        />
      ) : null}
      <ProductTextField
        controlId={`${idPrefix}-stock-warning-threshold`}
        defaultValue={defaults?.stockWarningThreshold ?? undefined}
        description="この数を下回ったら在庫が少ないものとして扱います。空欄なら扱いません。"
        inputMode="numeric"
        label="在庫警告の閾値"
        message={fieldErrors?.stockWarningThreshold?.[0]}
        min={0}
        name={PRODUCT_FORM_NAMES.stockWarningThreshold}
        required={false}
        type="number"
      />
      <ProductSelectField
        controlId={`${idPrefix}-category`}
        defaultValue={defaults?.categoryId}
        label="分類"
        message={fieldErrors?.categoryId?.[0]}
        name={PRODUCT_FORM_NAMES.categoryId}
        options={categoryOptions}
      />
    </div>
  );
}
