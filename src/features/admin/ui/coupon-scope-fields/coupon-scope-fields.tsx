"use client";

import { useCallback, useId, useMemo } from "react";

import { ComboboxClient } from "@/components/design-system/form/combobox-client/combobox-client";
import { Field, FieldDescription, FieldError } from "@/components/design-system/form/field/field";
import { RequirementBadge } from "@/components/design-system/form/requirement-badge/requirement-badge";
import { COUPON_SCOPE_NAME, type CouponScopeKind } from "@/model/coupon/coupon";

import {
  COUPON_SCOPE_FORM_NAMES,
  type CouponScopeField,
  type CouponScopeValues,
} from "../../coupon-scope";
import { PRODUCT_CANDIDATE_LIMIT, type ProductCandidates } from "../../use-product-candidates";
import { AdminRadioField, type AdminRadioOption } from "../radio-field/radio-field";
import { AdminSelectField, type AdminSelectOption } from "../select-field/select-field";

/** 種別の選択肢。並び順のまま出す。 */
const KIND_OPTIONS: readonly AdminRadioOption<CouponScopeKind>[] = [
  { value: "all", label: COUPON_SCOPE_NAME.all },
  { value: "category", label: COUPON_SCOPE_NAME.category },
  { value: "product", label: COUPON_SCOPE_NAME.product },
];

/** 候補の取得の状況ごとに、候補が 1 つも無いときに出す文言。 */
const EMPTY_MESSAGES: Readonly<Record<ProductCandidates["status"], string>> = {
  idle: "商品名を入力すると候補が並びます。",
  loading: "探しています…",
  unavailable: "候補を読み込めませんでした。時間をおいて入力し直してください。",
  found: "一致する商品がありません。",
};

/** `CouponScopeFields` の props。 */
export type CouponScopeFieldsProps = {
  /** 選ばれている値。 */
  values: CouponScopeValues;
  /** 値が変わったことを伝える。 */
  onValuesChange: (values: CouponScopeValues) => void;
  /** 選べるカテゴリ。 */
  categoryOptions: readonly AdminSelectOption[];
  /** 商品名で探した候補の取得の状況。取得は呼び出し元が持つ。 */
  productCandidates: ProductCandidates;
  /** 商品を探す語が変わったことを伝える。 */
  onProductSearchChange: (keyword: string) => void;
  /** 項目ごとの誤りの文言。 */
  messages: Readonly<Partial<Record<CouponScopeField, string>>>;
};

/**
 * 発行するクーポンが値引きの対象にする範囲を決める欄。
 *
 * @remarks
 * **値は呼び出し元が持ちます。** 確認の面が送るときに載せ直すためです。
 *
 * **対象の欄は種別に応じて 1 つだけ出します。** 全体は対象を持たず、カテゴリと商品は別の選び方を
 * します。切り替えても選んだ対象は捨てず、種別を戻せば元に戻ります。送るかどうかは読む側が種別で
 * 決めます。
 *
 * カテゴリは数が少なく静的なので native の `select` で選びます。商品は数が多いため名前で探して
 * 選びます。探す取得は持たず、取得の状況を受け取って並べるだけです — 取得をここに置くと、
 * 状況ごとの姿を story で出せません。
 *
 * **選んだ商品は、候補が入れ替わっても候補に残します。** 外れると、選んだはずの商品が欄から
 * 見えなくなります。
 *
 * @param props - 選ばれている値と候補、その変更の通知、項目ごとの誤りの文言。
 *
 * @see Storybook `Features/Admin/CouponScopeFields`
 */
export function CouponScopeFields({
  categoryOptions,
  messages,
  onProductSearchChange,
  onValuesChange,
  productCandidates,
  values,
}: CouponScopeFieldsProps) {
  const idPrefix = useId();
  const productLabelId = `${idPrefix}product-label`;
  const productErrorId = `${idPrefix}product-error`;
  const {
    categoryId: categoryName,
    kind: kindName,
    productId: productName,
  } = COUPON_SCOPE_FORM_NAMES;

  const changeKind = useCallback(
    (kind: CouponScopeKind) => onValuesChange({ ...values, kind }),
    [onValuesChange, values],
  );
  const changeCategory = useCallback(
    (categoryId: string) => onValuesChange({ ...values, categoryId }),
    [onValuesChange, values],
  );

  const productOptions = useMemo(() => {
    const found =
      productCandidates.status === "found"
        ? productCandidates.items.map(({ id, name }) => ({ value: id, label: name }))
        : [];
    const selectedIsListed = found.some((option) => option.value === values.productId);

    return values.productId === "" || selectedIsListed
      ? found
      : [{ value: values.productId, label: values.productName }, ...found];
  }, [productCandidates, values.productId, values.productName]);

  const changeProduct = useCallback(
    (productId: string) => {
      const chosen = productOptions.find((option) => option.value === productId);

      onValuesChange({ ...values, productId, productName: chosen?.label ?? "" });
    },
    [onValuesChange, productOptions, values],
  );

  return (
    <fieldset className="grid gap-4">
      <legend className="mb-2 font-emphasis text-base">値引きの対象</legend>
      <AdminRadioField
        legend="対象の範囲"
        name={kindName}
        onValueChange={changeKind}
        options={KIND_OPTIONS}
        required={true}
        value={values.kind}
        {...(messages[kindName] === undefined ? {} : { message: messages[kindName] })}
      />
      {values.kind === "category" ? (
        <div className="sm:max-w-md">
          <AdminSelectField
            controlId={`${idPrefix}category`}
            label="カテゴリ"
            name={categoryName}
            onValueChange={changeCategory}
            options={categoryOptions}
            value={values.categoryId}
            {...(messages[categoryName] === undefined ? {} : { message: messages[categoryName] })}
          />
        </div>
      ) : null}
      {values.kind === "product" ? (
        <Field className="sm:max-w-md" data-invalid={messages[productName] !== undefined}>
          <div className="flex items-center gap-2">
            <RequirementBadge required={true} />
            <span className="font-emphasis text-sm" id={productLabelId}>
              商品
            </span>
          </div>
          <ComboboxClient
            aria-labelledby={productLabelId}
            emptyMessage={EMPTY_MESSAGES[productCandidates.status]}
            name={productName}
            onSearchChange={onProductSearchChange}
            onValueChange={changeProduct}
            options={productOptions}
            placeholder="商品を選んでください"
            searchPlaceholder="商品名で探す"
            value={values.productId}
          />
          {productCandidates.status === "found" && productCandidates.hasMore ? (
            <FieldDescription>
              一致する商品のうち、先頭の {PRODUCT_CANDIDATE_LIMIT} 件を並べています。
              名前を詳しく入力すると絞り込めます。
            </FieldDescription>
          ) : null}
          {messages[productName] === undefined ? null : (
            <FieldError id={productErrorId}>{messages[productName]}</FieldError>
          )}
        </Field>
      ) : null}
    </fieldset>
  );
}
