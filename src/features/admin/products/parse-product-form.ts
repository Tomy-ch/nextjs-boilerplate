import type { FieldErrors } from "@/model/action-state";
import type { ProductDraft, ProductEdit, ProductImageDraft } from "@/model/product/product";

import { PRODUCT_NAME_MAX_LENGTH, PRODUCT_PRICE_PATTERN } from "./field-limits";
import type { ProductFormField } from "./form-state";

/** 入力欄の `name`。送る側と読む側で綴りが分かれないよう、ここだけが持つ。 */
export const PRODUCT_FORM_NAMES = {
  name: "name",
  description: "description",
  price: "price",
  quantity: "quantity",
  stockWarningThreshold: "stockWarningThreshold",
  categoryId: "categoryId",
  statusId: "statusId",
  publishedAt: "publishedAt",
  images: "images",
  version: "version",
} as const satisfies Readonly<Record<ProductFormField | "version", string>>;

/** 読み取りの結果。読めた場合だけ値を持つ。 */
export type ProductFormParseResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly fieldErrors: FieldErrors<ProductFormField> };

/** 空欄を undefined として読む。form は未入力を空文字として送るため。 */
function readText(form: FormData, key: string): string | undefined {
  const value = form.get(key);

  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();

  return trimmed === "" ? undefined : trimmed;
}

/**
 * 画像の一覧を読む。
 *
 * @remarks
 * 表示順は**送られてきた並びそのもの**です。画面が並べ替えた結果がその並びであり、番号を別の欄で
 * 受け取ると、並びと番号のどちらが正かが決まりません。
 */
function readImages(form: FormData): readonly ProductImageDraft[] {
  return form
    .getAll(PRODUCT_FORM_NAMES.images)
    .filter((value): value is string => typeof value === "string" && value !== "")
    .map((imagePath, index) => ({ imagePath, displaySort: index + 1 }));
}

/** 整数として読む。空欄は undefined、整数でなければ null。 */
function readInteger(form: FormData, key: string): number | undefined | null {
  const raw = readText(form, key);

  if (raw === undefined) return undefined;

  const value = Number(raw);

  return Number.isInteger(value) && value >= 0 ? value : null;
}

/** 日時として読む。空欄は undefined、日時として読めなければ null。 */
function readDate(form: FormData, key: string): Date | undefined | null {
  const raw = readText(form, key);

  if (raw === undefined) return undefined;

  const value = new Date(raw);

  return Number.isNaN(value.getTime()) ? null : value;
}

/** 共通部分の読み取りと、そこで見つかった誤り。 */
type CommonFields = {
  readonly draft: Omit<ProductDraft, "quantity">;
  readonly fieldErrors: Record<string, readonly string[]>;
};

function parseCommon(form: FormData): CommonFields {
  const fieldErrors: Record<string, readonly string[]> = {};

  const name = readText(form, PRODUCT_FORM_NAMES.name);
  if (name === undefined) {
    fieldErrors.name = ["商品名を入力してください。"];
  } else if (name.length > PRODUCT_NAME_MAX_LENGTH) {
    fieldErrors.name = [`商品名は ${PRODUCT_NAME_MAX_LENGTH} 文字までです。`];
  }

  const price = readText(form, PRODUCT_FORM_NAMES.price);
  if (price === undefined) {
    fieldErrors.price = ["価格を入力してください。"];
  } else if (!PRODUCT_PRICE_PATTERN.test(price)) {
    fieldErrors.price = ["価格は 0 以上の数値で入力してください。"];
  }

  const categoryId = readText(form, PRODUCT_FORM_NAMES.categoryId);
  if (categoryId === undefined) {
    fieldErrors.categoryId = ["分類を選んでください。"];
  }

  const statusId = readText(form, PRODUCT_FORM_NAMES.statusId);
  if (statusId === undefined) {
    fieldErrors.statusId = ["状態を選んでください。"];
  }

  const threshold = readInteger(form, PRODUCT_FORM_NAMES.stockWarningThreshold);
  if (threshold === null) {
    fieldErrors.stockWarningThreshold = ["在庫警告の閾値は 0 以上の整数で入力してください。"];
  }

  const publishedAt = readDate(form, PRODUCT_FORM_NAMES.publishedAt);
  if (publishedAt === null) {
    fieldErrors.publishedAt = ["公開日時を日付として読み取れませんでした。"];
  }

  return {
    draft: {
      name: name ?? "",
      description: readText(form, PRODUCT_FORM_NAMES.description) ?? null,
      price: price ?? "",
      stockWarningThreshold: threshold ?? null,
      categoryId: categoryId ?? "",
      statusId: statusId ?? "",
      publishedAt: publishedAt ?? null,
      images: readImages(form),
    },
    fieldErrors,
  };
}

/**
 * 作成のフォームを読む。
 *
 * @remarks
 * 検証をここに置くのは、**送信の編成と入力の読み取りを分ける**ためです
 * （[0021](../../../../../docs/adr/0021-frontend-responsibility.md)）。ここが持つのは form の
 * 綴りと、利用者へ返す文言までで、業務としての妥当性は backend が決めます。
 */
export function parseProductDraftForm(form: FormData): ProductFormParseResult<ProductDraft> {
  const { draft, fieldErrors } = parseCommon(form);

  const quantity = readInteger(form, PRODUCT_FORM_NAMES.quantity);
  if (quantity === undefined) {
    fieldErrors.quantity = ["在庫数を入力してください。"];
  } else if (quantity === null) {
    fieldErrors.quantity = ["在庫数は 0 以上の整数で入力してください。"];
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return { ok: true, value: { ...draft, quantity: quantity ?? 0 } };
}

/**
 * 編集のフォームを読む。
 *
 * @remarks
 * 版を必ず要求します。読み込んだ時点の版が無いまま送ると、その間の他者の更新を黙って消します。
 */
export function parseProductEditForm(form: FormData): ProductFormParseResult<ProductEdit> {
  const { draft, fieldErrors } = parseCommon(form);

  const version = readInteger(form, PRODUCT_FORM_NAMES.version);
  if (version === undefined || version === null) {
    fieldErrors.name = [
      ...(fieldErrors.name ?? []),
      "編集の前提が失われています。画面を開き直してください。",
    ];
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return { ok: true, value: { ...draft, version: version ?? 0 } };
}
