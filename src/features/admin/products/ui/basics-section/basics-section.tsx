"use client";

import { useCallback } from "react";

import { PRODUCT_NAME_MAX_LENGTH } from "../../field-limits";
import { PRODUCT_FORM_NAMES } from "../../form-names";
import type { ProductFormValues } from "../../use-product-values";
import type { ProductSelectOption } from "../select-field/select-field";
import { ProductSelectField } from "../select-field/select-field";
import { ProductTextField } from "../text-field/text-field";

/** `ProductBasicsSection` の props。 */
export type ProductBasicsSectionProps = {
  /** 入力欄の `id` の前置き。同じ画面に 2 つ置いても衝突しないよう外から与える。 */
  idPrefix: string;
  /** 選べる分類。 */
  categoryOptions: readonly ProductSelectOption[];
  /** 入力の状態と操作。 */
  form: ProductFormValues;
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
  form,
  idPrefix,
  withQuantity,
}: ProductBasicsSectionProps) {
  const { errors, setValue, touch, values } = form;

  const changeName = useCallback((value: string) => setValue("name", value), [setValue]);
  const leaveName = useCallback(() => touch("name"), [touch]);
  const changePrice = useCallback((value: string) => setValue("price", value), [setValue]);
  const leavePrice = useCallback(() => touch("price"), [touch]);
  const changeQuantity = useCallback((value: string) => setValue("quantity", value), [setValue]);
  const leaveQuantity = useCallback(() => touch("quantity"), [touch]);
  const changeThreshold = useCallback(
    (value: string) => setValue("stockWarningThreshold", value),
    [setValue],
  );
  const leaveThreshold = useCallback(() => touch("stockWarningThreshold"), [touch]);
  const changeCategory = useCallback(
    (value: string) => {
      setValue("categoryId", value);
      touch("categoryId");
    },
    [setValue, touch],
  );

  return (
    <div className="grid gap-6">
      <ProductTextField
        controlId={`${idPrefix}-name`}
        description={`${PRODUCT_NAME_MAX_LENGTH} 文字までです。`}
        label="商品名"
        message={errors.name?.[0]}
        name={PRODUCT_FORM_NAMES.name}
        onLeave={leaveName}
        onValueChange={changeName}
        required={true}
        value={values.name}
      />
      <ProductTextField
        controlId={`${idPrefix}-price`}
        description="USD で入力します。小数はそのまま保たれます。"
        inputMode="decimal"
        label="価格"
        message={errors.price?.[0]}
        name={PRODUCT_FORM_NAMES.price}
        onLeave={leavePrice}
        onValueChange={changePrice}
        placeholder="19.99"
        required={true}
        value={values.price}
      />
      {withQuantity ? (
        <ProductTextField
          controlId={`${idPrefix}-quantity`}
          description="登録した時点の在庫です。以降の増減は在庫の補充が持ちます。"
          inputMode="numeric"
          label="在庫数"
          message={errors.quantity?.[0]}
          min={0}
          name={PRODUCT_FORM_NAMES.quantity}
          onLeave={leaveQuantity}
          onValueChange={changeQuantity}
          required={true}
          type="number"
          value={values.quantity}
        />
      ) : null}
      <ProductTextField
        controlId={`${idPrefix}-stock-warning-threshold`}
        description="この数を下回ったら在庫が少ないものとして扱います。空欄なら扱いません。"
        inputMode="numeric"
        label="在庫警告の閾値"
        message={errors.stockWarningThreshold?.[0]}
        min={0}
        name={PRODUCT_FORM_NAMES.stockWarningThreshold}
        onLeave={leaveThreshold}
        onValueChange={changeThreshold}
        required={false}
        type="number"
        value={values.stockWarningThreshold}
      />
      <ProductSelectField
        controlId={`${idPrefix}-category`}
        label="分類"
        message={errors.categoryId?.[0]}
        name={PRODUCT_FORM_NAMES.categoryId}
        onValueChange={changeCategory}
        options={categoryOptions}
        value={values.categoryId}
      />
    </div>
  );
}
