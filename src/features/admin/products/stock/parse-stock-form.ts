import type { FieldErrors } from "@/model/action-state";
import type { ProductId } from "@/model/product/product";
import { toProductId } from "@/model/product/product";

import { STOCK_FORM_NAMES } from "./form-names";
import type { StockFormField } from "./form-state";
import { STOCK_QUANTITY_INVALID_MESSAGE, STOCK_TARGET_LOST_MESSAGE } from "./form-state";
import { isStockDirection, toStockDelta } from "./stock-direction";
import { toStockQuantity } from "./stock-quantity";

/** 送信を読んだ結果。 */
export type StockFormParseResult =
  | {
      readonly ok: true;
      readonly productId: ProductId;
      /** 契約へ送る増減量。符号付き。 */
      readonly delta: number;
    }
  | {
      readonly ok: false;
      readonly formError: string | null;
      readonly fieldErrors?: FieldErrors<StockFormField>;
    };

/**
 * 送られてきた在庫の変更を読む。
 *
 * @remarks
 * 量として読めるかの規則は [`toStockQuantity`](./stock-quantity.ts) が持ちます。見込みを出す側と
 * 同じ規則を使うためで、片方だけに書くと画面と送信で判定が食い違います。
 *
 * 向きが読めない値は既定へ倒さず弾きます。「補充のつもりが差し引かれた」を黙って起こさない
 * ためで、どちらか判らないまま在庫を動かす筋はありません。
 */
export function parseStockForm(formData: FormData): StockFormParseResult {
  const id = formData.get(STOCK_FORM_NAMES.productId);

  if (typeof id !== "string" || id === "") {
    return { ok: false, formError: STOCK_TARGET_LOST_MESSAGE };
  }

  const direction = formData.get(STOCK_FORM_NAMES.direction);

  if (!isStockDirection(direction)) {
    return { ok: false, formError: STOCK_TARGET_LOST_MESSAGE };
  }

  const raw = formData.get(STOCK_FORM_NAMES.quantity);
  const quantity = typeof raw === "string" ? toStockQuantity(raw) : null;

  if (quantity === null) {
    return {
      ok: false,
      formError: null,
      fieldErrors: { quantity: [STOCK_QUANTITY_INVALID_MESSAGE] },
    };
  }

  return { ok: true, productId: toProductId(id), delta: toStockDelta(direction, quantity) };
}
