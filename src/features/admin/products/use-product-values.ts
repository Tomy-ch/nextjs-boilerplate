"use client";

import { useCallback, useMemo, useState } from "react";

import type { FieldErrors } from "@/model/action-state";
import type { Product } from "@/model/product/product";
import type { ProductFormSection } from "./form-sections";
import { validatedFieldsOf } from "./form-sections";
import type { ProductFormField } from "./form-state";
import type { ProductValidatedField } from "./product-rules";
import { PRODUCT_FIELD_RULES } from "./product-rules";

/** 画面が持つ入力の値。すべて文字列で持ち、送るときも入力欄の値のまま運ぶ。 */
export type ProductValues = Readonly<Record<ProductValidatedField | "description", string>>;

/** 形の上での判定を持つ項目。判定を回す順でもある。 */
const PRODUCT_VALIDATED_FIELDS = [
  "name",
  "price",
  "quantity",
  "stockWarningThreshold",
  "categoryId",
  "statusId",
  "publishedAt",
] as const satisfies readonly ProductValidatedField[];

/** 画面が値として持つ項目のすべて。 */
const PRODUCT_VALUE_FIELDS = [
  ...PRODUCT_VALIDATED_FIELDS,
  "description",
] as const satisfies readonly (keyof ProductValues)[];

/** `datetime-local` が受け取る形へ写す。秒より下は扱わない。 */
function toLocalInputValue(value: Date | null): string {
  if (value === null) return "";

  const offset = value.getTimezoneOffset() * 60_000;

  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
}

/** 何も無い状態から始めるときの値。 */
export function emptyProductValues(): ProductValues {
  return {
    name: "",
    price: "",
    quantity: "",
    stockWarningThreshold: "",
    categoryId: "",
    statusId: "",
    publishedAt: "",
    description: "",
  };
}

/** 読み込んだ商品から始めるときの値。 */
export function productValuesOf(product: Product): ProductValues {
  return {
    name: product.name,
    price: product.price,
    quantity: String(product.quantity),
    stockWarningThreshold:
      product.stockWarningThreshold === null ? "" : String(product.stockWarningThreshold),
    categoryId: product.category.id,
    statusId: product.status.id,
    publishedAt: toLocalInputValue(product.publishedAt),
    description: product.description ?? "",
  };
}

/** 画面が持つ入力の状態と、その操作。 */
export type ProductFormValues = {
  /** 今の値。 */
  readonly values: ProductValues;
  /** 形の上での誤り。触れた項目のぶんだけ返す。 */
  readonly errors: FieldErrors<ProductFormField>;
  /** 最初の値から変わっているか。 */
  readonly dirty: boolean;
  /** 1 項目を書き換える。 */
  readonly setValue: (field: keyof ProductValues, value: string) => void;
  /** 1 項目を「触れた」ものとして印を付ける。 */
  readonly touch: (field: keyof ProductValues) => void;
  /** その段の必須が埋まっていないか。 */
  readonly isSectionBlocked: (section: ProductFormSection) => boolean;
};

/**
 * 入力の値を画面が持つ。
 *
 * @remarks
 * **入力欄に任せず state で持ちます。** `<form action>` は送信が終わると入力欄を元へ戻すため、
 * 弾かれた送信のあとに書いた内容が消えます。値を state に置けば、返ってきた誤りと書きかけの
 * 両方が画面に残ります。
 *
 * 誤りは**触れた項目だけ**返します。開いた直後から空欄をすべて赤くすると、まだ何もしていない
 * 人に落ち度を告げることになります。段を進めてよいかの判定（{@link ProductFormValues.isSectionBlocked}）
 * は触れたかどうかに関わらず行うため、埋まっていない段からは進めません。
 *
 * 規則は {@link PRODUCT_FIELD_RULES} が持ち、受け取る側の Server Action も同じものを通ります。
 *
 * @param initial - 開いた時点の値。ここからの差分が「書きかけ」の判定になる
 * @param options.withQuantity - 在庫数を尋ねるか。編集では別の口が持つため尋ねない
 */
export function useProductValues(
  initial: ProductValues,
  { withQuantity }: { withQuantity: boolean },
): ProductFormValues {
  const [values, setValues] = useState(initial);
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());

  const setValue = useCallback((field: keyof ProductValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
  }, []);

  const touch = useCallback((field: keyof ProductValues) => {
    setTouched((current) => new Set(current).add(field));
  }, []);

  const failures = useMemo(() => {
    const found: Partial<Record<ProductValidatedField, string>> = {};

    for (const field of PRODUCT_VALIDATED_FIELDS) {
      // 在庫数は作るときだけ尋ねる。編集では別の口が持つため、空欄でも欠けたことにならない。
      if (field === "quantity" && !withQuantity) continue;

      const message = PRODUCT_FIELD_RULES[field](values[field]);

      if (message !== undefined) found[field] = message;
    }

    return found;
  }, [values, withQuantity]);

  const errors = useMemo(() => {
    const shown: Partial<Record<ProductValidatedField, readonly string[]>> = {};

    for (const field of PRODUCT_VALIDATED_FIELDS) {
      const message = failures[field];

      if (message !== undefined && touched.has(field)) shown[field] = [message];
    }

    return shown;
  }, [failures, touched]);

  const isSectionBlocked = useCallback(
    (section: ProductFormSection) =>
      validatedFieldsOf(section, PRODUCT_VALIDATED_FIELDS).some(
        (field) => failures[field] !== undefined,
      ),
    [failures],
  );

  const dirty = useMemo(
    () => PRODUCT_VALUE_FIELDS.some((field) => values[field] !== initial[field]),
    [initial, values],
  );

  return { values, errors, dirty, setValue, touch, isSectionBlocked };
}
