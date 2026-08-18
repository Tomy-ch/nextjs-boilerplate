import "server-only";

import { convertToReferenceAmount } from "@/adapters/server/api/exchange-rates";
import { getLogger, reportQuietly } from "@/logging/logging.server";
import type { ReferenceAmount } from "@/model/money";

/**
 * 表示通貨での参考換算額を読む。取得に失敗しても投げない。
 *
 * @remarks
 * **参考換算額が無くても購入は成り立ちます。** 請求されるのは基準通貨の金額で、換算額は読み手が
 * 大きさを掴むための添え物です。ここで投げると、外部のレート提供元が落ちているあいだ購入そのものが
 * できなくなります（[0080](../../../docs/adr/0080-error-handling.md) の「部分エラーで全体を落とさない」）。
 *
 * 読めなかったことは、画面が円の表示を出さないことで表します。0 円や「—」を置きません。金額として
 * 読める形を残すと、換算できなかったことが「その金額である」と受け取られます。
 *
 * @param minorUnits - 最小単位（セント）の整数で表した基準通貨の金額
 * @returns 換算できなければ null
 */
export async function readReferenceAmount(minorUnits: number): Promise<ReferenceAmount | null> {
  try {
    return await convertToReferenceAmount(minorUnits);
  } catch (cause) {
    reportQuietly(() => getLogger().warn("参考換算額を読めませんでした", { cause: String(cause) }));

    return null;
  }
}
