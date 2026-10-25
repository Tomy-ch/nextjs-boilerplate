import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { errorMetaFrom } from "@/errors/error-meta";
import type { FieldErrors } from "@/model/action-state";

import {
  CAMPAIGN_CODE_CONFLICT_MESSAGE,
  CAMPAIGN_FIELD_LABELS,
  type CampaignOwnField,
} from "./form-state";

/**
 * 接続先が名指しした項目を、この画面の入力欄として読めるか。
 *
 * @param name - 判定する項目名
 * @returns この画面の入力欄として読めれば true
 */
function isCampaignOwnField(name: string): name is CampaignOwnField {
  return Object.hasOwn(CAMPAIGN_FIELD_LABELS, name);
}

/**
 * 送信が接続先に弾かれたとき、入力欄へ出す文言を組む。
 *
 * @remarks
 * **409 はコードの欄へ出します。** この操作で一意を問われるのはコードだけです。
 *
 * 422 は、接続先が名指しした欄があればそこへ出します。契約が返すのは項目名だけで、理由は
 * 載っていません。判っていることだけを書きます。名指しが無ければ空を返し、呼び出し元が全体の
 * 文言にまとめます。
 *
 * @param error - 送信で投げられたエラー
 * @returns 入力欄ごとの文言。出す先が無ければ空
 */
export function toCampaignFieldErrors(error: unknown): FieldErrors<CampaignOwnField> {
  const kind = findAppError(error)?.kind;

  if (kind === ErrorKind.CONFLICT) {
    return { code: [CAMPAIGN_CODE_CONFLICT_MESSAGE] };
  }

  if (kind !== ErrorKind.VALIDATION) {
    return {};
  }

  const fieldErrors: Partial<Record<CampaignOwnField, readonly string[]>> = {};

  for (const name of errorMetaFrom(error)?.details ?? []) {
    if (isCampaignOwnField(name)) {
      fieldErrors[name] = [
        `${CAMPAIGN_FIELD_LABELS[name]}は受け付けられませんでした。入力し直してください。`,
      ];
    }
  }

  return fieldErrors;
}
