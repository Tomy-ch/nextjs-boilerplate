"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import {
  createProduct,
  PRODUCTS_TAG,
  updateProduct,
  uploadProductImage,
} from "@/adapters/server/api/products";
import { verifySession } from "@/adapters/server/auth/session";
import { getHttpConfig } from "@/config/http/http.server";
import { createAppError, findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { ADMIN_PRODUCT_LIST_PATH } from "@/features/admin/paths";
import { PRODUCT_IMAGE_ACCEPT } from "@/features/admin/products/form/field-limits";
import type {
  ProductFormState,
  ProductImageUploadState,
} from "@/features/admin/products/form/form-state";
import { PRODUCT_VERSION_CONFLICT_MESSAGE } from "@/features/admin/products/form/form-state";
import {
  PRODUCT_FORM_NAMES,
  parseProductDraftForm,
  parseProductEditForm,
} from "@/features/admin/products/form/parse-product-form";
import {
  actionStateFromError,
  failedActionState,
  succeededActionState,
} from "@/model/action-state";
import { isAdmin } from "@/model/authz";
import { toProductId } from "@/model/product/product";

const INVALID_INPUT_MESSAGE = "入力内容を確認してください。";

const MISSING_IMAGE_MESSAGE = "画像が選ばれていません。";
const UNSUPPORTED_IMAGE_MESSAGE = "PNG / JPEG / WebP のいずれかを選んでください。";
const OVERSIZED_IMAGE_MESSAGE = "画像が大きすぎます。もっと小さいものを選んでください。";

/** 役割を持たない主体の要求をここで止める。 */
async function assertAdmin(): Promise<void> {
  if (!isAdmin(await verifySession())) {
    throw createAppError(ErrorKind.PERMISSION_DENIED, {
      cause: new Error("管理の操作に必要な役割がありません"),
    });
  }
}

/**
 * 商品を読む取得をまとめて取り直させる。
 *
 * @remarks
 * `updateTag` を使うのは、この直後に一覧へ送るためです。次の要求は新しい値を待ってから描かれる
 * ので、たった今作った商品が並んでいない一覧を見せずに済みます。
 *
 * 印は取得の側が付けており（`PRODUCTS_TAG`）、管理と利用者向けのどちらの画面から読んでも同じ
 * 印が付きます。路ごとに個別へ取り直させると、印の付いた取得が増えるたびに書き足しが要ります。
 */
function revalidateProducts(): void {
  updateTag(PRODUCTS_TAG);
}

/**
 * 画像を 1 件アップロードする。
 *
 * @remarks
 * app 層に置くのは、役割の確認が `adapters/server/auth` の領分で、そこへ触れてよいのが app 層
 * だからです（`architecture.ts` の `adapters-auth`）。画面の側は送信先を受け取るだけです。
 *
 * **画面から受け取った時点でもう一度確かめます。** 送る前の判定はブラウザ側にあり、送信者が
 * 差し替えられます。署名付き URL の経路なら署名ポリシーが担っていた層がここには無いため、
 * この段が最後の砦です（[0075](../../../../../docs/adr/0075-file-upload-seam.md)）。
 *
 * 形式は宣言された `type` で見ます。これは送信者が付けられる値なので、中身がその形式である
 * ことまでは保証しません。中身の判定は保存する側が持ちます。
 */
export async function uploadProductImageAction(
  _previous: ProductImageUploadState,
  formData: FormData,
): Promise<ProductImageUploadState> {
  try {
    await assertAdmin();
  } catch (error) {
    return actionStateFromError(error);
  }

  const image = formData.get(PRODUCT_FORM_NAMES.images);

  if (!(image instanceof File) || image.size === 0) {
    return failedActionState({ formError: MISSING_IMAGE_MESSAGE });
  }

  if (!PRODUCT_IMAGE_ACCEPT.split(",").includes(image.type)) {
    return failedActionState({ formError: UNSUPPORTED_IMAGE_MESSAGE });
  }

  if (image.size > getHttpConfig().maxUploadBytes) {
    return failedActionState({ formError: OVERSIZED_IMAGE_MESSAGE });
  }

  try {
    return succeededActionState(await uploadProductImage(image));
  } catch (error) {
    return actionStateFromError(error);
  }
}

/**
 * 商品を作る。
 *
 * @remarks
 * 成立したら一覧へ送ります。作った直後に同じ空のフォームへ留まると、続けて押したときに同じ
 * 商品をもう 1 件作れてしまいます。
 */
export async function createProductAction(
  _previous: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  try {
    await assertAdmin();
  } catch (error) {
    return actionStateFromError(error);
  }

  const parsed = parseProductDraftForm(formData);

  if (!parsed.ok) {
    // 項目ごとの誤りがあるときは全体の文言を出さない。要約が同じことを言うため、同じ指摘が
    // 2 か所に並ぶ。
    return failedActionState({ formError: null, fieldErrors: parsed.fieldErrors });
  }

  try {
    await createProduct(parsed.value);
  } catch (error) {
    return actionStateFromError(error);
  }

  revalidateProducts();
  redirect(ADMIN_PRODUCT_LIST_PATH);
}

/**
 * 商品を更新する。
 *
 * @remarks
 * `409` にだけ専用の文言を当てます。カタログの既定文言は分類だけを伝えるもので、拒まれた理由が
 * 「読み込んでからの間に別の人が更新した」ことであるのは、この画面でしか言えません。
 */
export async function updateProductAction(
  _previous: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  try {
    await assertAdmin();
  } catch (error) {
    return actionStateFromError(error);
  }

  const id = formData.get("id");
  const parsed = parseProductEditForm(formData);

  if (!parsed.ok) {
    return failedActionState({ formError: null, fieldErrors: parsed.fieldErrors });
  }

  if (typeof id !== "string" || id === "") {
    return failedActionState({ formError: INVALID_INPUT_MESSAGE });
  }

  try {
    await updateProduct(toProductId(id), parsed.value);
  } catch (error) {
    if (findAppError(error)?.kind === ErrorKind.CONFLICT) {
      return failedActionState({ formError: PRODUCT_VERSION_CONFLICT_MESSAGE });
    }

    return actionStateFromError(error);
  }

  revalidateProducts();
  redirect(ADMIN_PRODUCT_LIST_PATH);
}
