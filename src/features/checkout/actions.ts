"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getMyCart, removeMyCartItem } from "@/adapters/server/api/cart";
import { createPurchase } from "@/adapters/server/api/purchases";
import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { getLogger, reportQuietly } from "@/logging/logging.server";
import { actionStateFromError, failedActionState } from "@/model/action-state";
import type { PurchaseOrderLine } from "@/model/purchase/purchase";

import type { PlaceOrderFormState } from "./form-state";
import { IDEMPOTENCY_KEY_FIELD } from "./idempotency-key";
import { orderLinesOf } from "./order";
import { purchaseCompletePath } from "./paths";

const INVALID_REQUEST_MESSAGE = "画面を開き直してから、もう一度お試しください。";
const NOTHING_TO_ORDER_MESSAGE =
  "購入できる商品がありません。カートの内容を確かめてから、もう一度お試しください。";
const CONFLICT_MESSAGE =
  "確定するあいだに在庫か価格が変わりました。内容を確かめてから、もう一度お試しください。";

/**
 * カートから購入した明細を取り除く。取り除けなくても投げない。
 *
 * @remarks
 * **購入はこの時点で成立しています。** 後始末が通らなかったことを理由に完了を見せないと、
 * 利用者には購入できなかったように映ります（[0080](../../../docs/adr/0080-error-handling.md)）。
 *
 * 買った明細だけを取り除きます。カートを丸ごと空にすると、値が変わって今回の購入から外れた
 * 明細まで消え、利用者が選び直す手掛かりを失います。
 */
async function removeOrderedLines(lines: readonly PurchaseOrderLine[]): Promise<void> {
  try {
    await Promise.all(lines.map(({ productId }) => removeMyCartItem(productId)));
  } catch (cause) {
    reportQuietly(() =>
      getLogger().warn("購入した明細をカートから取り除けませんでした", { cause: String(cause) }),
    );
  }
}

/**
 * 購入を確定する。
 *
 * @remarks
 * **送る明細はこの時点のカートから組み直します。** 画面が見せていた内容を送り返すと、開いたまま
 * 放置されたあいだに在庫や価格が変わっていても、古い前提のまま確定できてしまいます。
 *
 * **冪等キーは画面が組んだ時点の値をそのまま使います。** 二重に押しても再読み込みで送り直しても、
 * 同じ鍵で届いた要求は初回の結果の再生として扱われ、購入は 1 件のままです。
 *
 * 成立したら完了画面へ送ります。同じ画面で完了を見せると、再読み込みで完了が消え、戻る操作が
 * 確定前の画面へ帰ります（[0063](../../../docs/adr/0063-mutation-result-notification.md)）。
 */
export async function placeOrderAction(
  _previous: PlaceOrderFormState,
  formData: FormData,
): Promise<PlaceOrderFormState> {
  const idempotencyKey = z.uuid().safeParse(formData.get(IDEMPOTENCY_KEY_FIELD));

  if (!idempotencyKey.success) {
    return failedActionState({ formError: INVALID_REQUEST_MESSAGE });
  }

  const lines = orderLinesOf(await getMyCart());

  if (lines.length === 0) {
    return failedActionState({ formError: NOTHING_TO_ORDER_MESSAGE });
  }

  let purchaseId: string;

  try {
    purchaseId = await createPurchase(lines, idempotencyKey.data);
  } catch (error) {
    if (findAppError(error)?.kind === ErrorKind.CONFLICT) {
      return failedActionState({ formError: CONFLICT_MESSAGE });
    }

    return actionStateFromError(error);
  }

  await removeOrderedLines(lines);

  redirect(purchaseCompletePath(purchaseId));
}
