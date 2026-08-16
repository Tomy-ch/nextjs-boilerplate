"use server";

import { revalidatePath } from "next/cache";

import { clearMyCart, removeMyCartItem, setMyCartItem } from "@/adapters/server/api/cart";
import {
  type ActionState,
  actionStateFromError,
  failedActionState,
  succeededActionState,
} from "@/model/action-state";

import { readProductId, readQuantity } from "./parse-cart-form";

/**
 * カートを出しているすべての画面を取り直させる。
 *
 * @remarks
 * 明細は画面の本体だけでなく、どの画面にも付く外枠（脇の領域と header の点数）にも出ます。経路を
 * 1 つ指定しても外枠は古いままになるため、layout の段で無効にします。
 */
function revalidateCart(): void {
  revalidatePath("/", "layout");
}

/**
 * カートの操作が画面へ返す結果。
 *
 * @remarks
 * 成功しても返す値はありません。操作の後に画面が出すのは更新後のカートであり、それは同じ往復で
 * 再描画される Server Component が持ちます。
 */
export type CartActionState = ActionState<void>;

/** 送信された内容を解けなかったときの文言。 */
const MALFORMED_MESSAGE = "操作を受け付けられませんでした。画面を読み込み直してください。";

/**
 * 明細の数量を設定する。
 *
 * @remarks
 * 加算ではなく設定です。同じ要求が 2 度届いても結果が変わらないため、二重送信を防ぐ鍵を
 * 要しません（冪等性は明細の自然キーから来ます）。
 *
 * 在庫を超えた数量も拒みません。買えるかどうかは明細の `issues` として次の取得で現れます。
 */
export async function setCartItemQuantityAction(
  _previous: CartActionState,
  formData: FormData,
): Promise<CartActionState> {
  const productId = readProductId(formData);
  const quantity = readQuantity(formData);

  if (productId === null || quantity === null) {
    return failedActionState({ formError: MALFORMED_MESSAGE });
  }

  try {
    await setMyCartItem(productId, quantity);
  } catch (error) {
    return actionStateFromError(error);
  }

  revalidateCart();

  return succeededActionState(undefined);
}

/**
 * 明細を取り除く。
 *
 * @remarks
 * 対象が既に無くても成功します。買えない明細も取り除けます。
 */
export async function removeCartItemAction(
  _previous: CartActionState,
  formData: FormData,
): Promise<CartActionState> {
  const productId = readProductId(formData);

  if (productId === null) {
    return failedActionState({ formError: MALFORMED_MESSAGE });
  }

  try {
    await removeMyCartItem(productId);
  } catch (error) {
    return actionStateFromError(error);
  }

  revalidateCart();

  return succeededActionState(undefined);
}

/**
 * カートを空にする。
 *
 * @remarks
 * カートそのものは残ります。空にしても利用者の同一性は切れません。
 */
export async function clearCartAction(
  _previous: CartActionState,
  _formData: FormData,
): Promise<CartActionState> {
  try {
    await clearMyCart();
  } catch (error) {
    return actionStateFromError(error);
  }

  revalidateCart();

  return succeededActionState(undefined);
}
