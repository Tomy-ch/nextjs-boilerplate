import { findAppError } from "@/errors/app-error";
import { resolveErrorMeta } from "@/errors/error-catalog";
import { ErrorKind } from "@/errors/error-kind";
import type { FieldErrors } from "@/model/action-state";
import type { ProfileField } from "@/model/user/profile-schema";

import { PROFILE_FIELD_LABELS } from "./field-labels";

/**
 * 接続先が名指しした項目を、この画面の入力欄として読めるか。
 *
 * @remarks
 * **名前が一致していることに頼りません。**契約の項目名とフォームの項目名は今のところ同じ綴りですが、
 * それは契約側の都合で変わり得ます。読めない名前をそのまま鍵にすると、どの入力欄にも結び付かない
 * 文言を状態へ入れることになり、画面は何も出さないのに「項目の誤りがある」状態になります。
 */
function isProfileField(name: string): name is ProfileField {
  return Object.hasOwn(PROFILE_FIELD_LABELS, name);
}

/**
 * 接続先に弾かれた項目の言い方。
 *
 * @remarks
 * **理由は書けません。**契約が返すのは項目名だけで、なぜ通らなかったかは載っていません
 * （`details` は「公開して安全な識別子」であり、入力値も理由文も含まない約束です）。判っている
 * ことだけを書き、判っていないことを補いません。
 *
 * 項目名を主語にするのは、送る前の検証が出す文言と同じ理由です。誤りだけを読んでどこを直せば
 * よいか判る必要があり、支援技術は項目から離れた位置で読み上げることがあります。
 */
function rejectionMessageOf(field: ProfileField): string {
  return `${PROFILE_FIELD_LABELS[field]}は受け付けられませんでした。入力し直してください。`;
}

/**
 * 送信が接続先に弾かれたとき、名指しされた入力欄へ出す文言を組む。
 *
 * @remarks
 * 送る前の検証が弾いたときと**同じ形**を返します。画面はどちらで弾かれたかを知らずに、項目ごとの
 * 文言として同じように出せます（`use-profile-fields` が client 側を優先し、無ければこちらを使う）。
 *
 * 分類が検証でないときは何も返しません。競合も権限も、項目に紐づく失敗ではないためです。
 *
 * @param error 送信で投げられたエラー
 * @returns 名指しされた入力欄ごとの文言。名指しが無い、または読めない名前だけのときは空
 */
export function toProfileFieldErrors(error: unknown): FieldErrors<ProfileField> {
  if (findAppError(error)?.kind !== ErrorKind.VALIDATION) {
    return {};
  }

  const fieldErrors: Partial<Record<ProfileField, readonly string[]>> = {};

  for (const name of resolveErrorMeta(error)?.details ?? []) {
    if (isProfileField(name)) {
      fieldErrors[name] = [rejectionMessageOf(name)];
    }
  }

  return fieldErrors;
}
