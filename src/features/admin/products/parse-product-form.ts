import type { FieldErrors } from "@/model/action-state";
import type { ProductDraft, ProductEdit, ProductImageDraft } from "@/model/product/product";

import { PRODUCT_FORM_NAMES } from "./form-names";
import type { ProductFormField } from "./form-state";
import type { ProductValidatedField } from "./product-rules";
import { PRODUCT_FIELD_RULES } from "./product-rules";

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

/**
 * 版を読む。
 *
 * @remarks
 * 版は利用者が入力する項目ではないため、形の上での判定を持つ項目の一覧には入りません。読めない
 * ときは「編集の前提が失われた」であって、直せる入力の誤りではありません。
 */
function readVersion(form: FormData): number | undefined {
  const raw = readText(form, PRODUCT_FORM_NAMES.version);

  if (raw === undefined) return undefined;

  const value = Number(raw);

  return Number.isInteger(value) && value >= 0 ? value : undefined;
}

/** 共通部分の読み取りと、そこで見つかった誤り。 */
type CommonFields = {
  readonly draft: Omit<ProductDraft, "quantity">;
  readonly fieldErrors: Record<string, readonly string[]>;
};

/**
 * 1 項目を読み、形の上での判定に掛ける。
 *
 * @remarks
 * **判定と文言は {@link PRODUCT_FIELD_RULES} が持ちます。**同じ判定を画面の側も通るため、ここへ
 * 書き写すと同じ誤りに 2 通りの言い方が生まれ、片方だけを直せます。
 */
function check(
  form: FormData,
  field: ProductValidatedField,
  fieldErrors: Record<string, readonly string[]>,
): string {
  const raw = form.get(PRODUCT_FORM_NAMES[field]);
  const value = typeof raw === "string" ? raw : "";
  const message = PRODUCT_FIELD_RULES[field](value);

  if (message !== undefined) fieldErrors[field] = [message];

  return value.trim();
}

function parseCommon(form: FormData): CommonFields {
  const fieldErrors: Record<string, readonly string[]> = {};

  const name = check(form, "name", fieldErrors);
  const price = check(form, "price", fieldErrors);
  const categoryId = check(form, "categoryId", fieldErrors);
  const statusId = check(form, "statusId", fieldErrors);
  const threshold = check(form, "stockWarningThreshold", fieldErrors);
  const publishedAt = check(form, "publishedAt", fieldErrors);

  return {
    draft: {
      name,
      description: readText(form, PRODUCT_FORM_NAMES.description) ?? null,
      price,
      stockWarningThreshold: threshold === "" ? null : Number(threshold),
      categoryId,
      statusId,
      publishedAt: publishedAt === "" ? null : new Date(publishedAt),
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

  const quantity = check(form, "quantity", fieldErrors);

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return { ok: true, value: { ...draft, quantity: Number(quantity) } };
}

/**
 * 編集のフォームを読む。
 *
 * @remarks
 * 版を必ず要求します。読み込んだ時点の版が無いまま送ると、その間の他者の更新を黙って消します。
 */
export function parseProductEditForm(form: FormData): ProductFormParseResult<ProductEdit> {
  const { draft, fieldErrors } = parseCommon(form);

  const version = readVersion(form);

  // 版が無いまま先へ進ませない。既定値へ倒すと、読み込んでいない版で他者の更新を上書きする。
  if (version === undefined) {
    return {
      ok: false,
      fieldErrors: {
        ...fieldErrors,
        name: [
          ...(fieldErrors.name ?? []),
          "編集の前提が失われています。画面を開き直してください。",
        ],
      },
    };
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return { ok: true, value: { ...draft, version } };
}
