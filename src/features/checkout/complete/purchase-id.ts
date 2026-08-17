import { z } from "zod";

import { PURCHASE_PARAM } from "../paths";

/** 検索条件として届く生の値。 */
export type RawSearchParams = Readonly<Record<string, string | readonly string[] | undefined>>;

const purchaseIdSchema = z.uuid();

/**
 * 完了画面が見せる購入を、検索条件から読む。
 *
 * @remarks
 * 形まで確かめます。手で書き換えられる値であり、確かめずに取得へ渡すと、契約が受け付けない
 * 文字列がそのまま外へ出ます（`rules.md` #42）。
 *
 * 同じ条件が繰り返されていたら読みません。どれを指しているのかを決める根拠が無く、先頭を採るのは
 * 推測になります。
 *
 * @returns 指している購入が読み取れなければ null
 */
export function readPurchaseId(searchParams: RawSearchParams): string | null {
  const parsed = purchaseIdSchema.safeParse(searchParams[PURCHASE_PARAM]);

  return parsed.success ? parsed.data : null;
}
