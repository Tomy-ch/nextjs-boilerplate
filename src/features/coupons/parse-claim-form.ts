import { z } from "zod";

import { IDEMPOTENCY_KEY_FIELD } from "@/model/idempotency-key";

import { CLAIM_CODE_FIELD } from "./form-names";
import { EMPTY_CODE_MESSAGE } from "./form-state";

/** 受け取りの内容を解いた結果。読めなかった項目は、そのまま項目の文言になる。 */
export type ClaimCouponFormResult =
  | { readonly ok: true; readonly code: string; readonly idempotencyKey: string }
  | { readonly ok: false; readonly reason: "unreadable" }
  | { readonly ok: false; readonly reason: "field"; readonly codeError: string };

/**
 * 受け取りの内容を、契約が受け付ける形へ解く。
 *
 * @remarks
 * **コードは書き換えずに渡します。** 前後の空白と大文字・小文字の違いは契約側が無視します。
 * 空白だけの入力を空として止めるのは、送っても必ず弾かれるものを往復させないためです。
 *
 * 長さと形式は確かめません。契約が宣言しておらず、受け取れない理由は区別されずに返るためです。
 *
 * @param formData - 受け取り欄から届いたフォームの内容。
 * @returns 解いた結果。成功ならコードと冪等キー、失敗ならコードの項目エラー（解けない送信は `null`）。
 */
export function parseClaimCouponForm(formData: FormData): ClaimCouponFormResult {
  const code = z.string().safeParse(formData.get(CLAIM_CODE_FIELD));
  const idempotencyKey = z.uuid().safeParse(formData.get(IDEMPOTENCY_KEY_FIELD));

  if (!idempotencyKey.success) {
    return { ok: false, reason: "unreadable" };
  }

  if (!code.success || code.data.trim() === "") {
    return { ok: false, reason: "field", codeError: EMPTY_CODE_MESSAGE };
  }

  return { ok: true, code: code.data, idempotencyKey: idempotencyKey.data };
}
