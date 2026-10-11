import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { errorMetaFrom } from "@/errors/error-meta";
import type { FieldErrors } from "@/model/action-state";

import { DISCONTINUE_FIELD_LABELS, type DiscontinueProductField } from "./form-state";

/**
 * 接続先が名指しした項目を、この画面の入力欄として読めるか。
 *
 * @remarks
 * 名前が一致していることに頼りません。読めない名前をそのまま鍵にすると、どの入力欄にも結び付かない
 * 文言を状態へ入れることになり、画面は何も出さないのに「項目の誤りがある」状態になります。
 *
 * @param name - 判定する項目名
 * @returns この画面の入力欄として読めれば true
 */
function isDiscontinueField(name: string): name is DiscontinueProductField {
  return Object.hasOwn(DISCONTINUE_FIELD_LABELS, name);
}

/**
 * 送信が接続先に弾かれたとき、名指しされた入力欄へ出す文言を組む。
 *
 * @remarks
 * 契約が返すのは項目名だけで、理由は載っていません。判っていることだけを書きます。値引き率の
 * 範囲（0 より大きく 1 以下）はこの経路で返ります。
 *
 * 分類が検証でないときは何も返しません。競合も権限も、項目に紐づく失敗ではないためです。
 *
 * @param error - 送信で投げられたエラー
 * @returns 名指しされた入力欄ごとの文言。名指しが無い、または読めない名前だけのときは空
 */
export function toDiscontinueFieldErrors(error: unknown): FieldErrors<DiscontinueProductField> {
  if (findAppError(error)?.kind !== ErrorKind.VALIDATION) {
    return {};
  }

  const fieldErrors: Partial<Record<DiscontinueProductField, readonly string[]>> = {};

  for (const name of errorMetaFrom(error)?.details ?? []) {
    if (isDiscontinueField(name)) {
      fieldErrors[name] = [
        `${DISCONTINUE_FIELD_LABELS[name]}は受け付けられませんでした。入力し直してください。`,
      ];
    }
  }

  return fieldErrors;
}
