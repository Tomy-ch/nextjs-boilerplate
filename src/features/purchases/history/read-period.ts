import { z } from "zod";

import { PURCHASE_MAX_RECENT_DAYS, PURCHASE_MONTH_PATTERN } from "@/adapters/client/api/purchases";
import { type RawSearchParams, singleValue } from "@/model/search-params";

import { ALL_PERIOD, PERIOD_KEY, type PeriodSelection } from "./period";

/**
 * URL を読む側。**組む側（[`period.ts`](period.ts)）と分けてある。**
 *
 * @remarks
 * 読むのは画面を組み立てる地点だけで、組むのは期間の入力欄や続きの読み込みといった client の
 * 部品です。同じ module に置くと、スキーマを組み立てる module 直下の式が tree-shaking を妨げ、
 * **検証ライブラリごと client の束に載ります**（[0101](../../../../docs/adr/0101-performance-budget.md)）。
 * 境界を強制しているのは束であって、読みやすさではありません。
 */

/** 暦月 1 つを表す `YYYY-MM`。書式は契約が宣言したものを使う。 */
const monthSchema = singleValue(z.string().regex(PURCHASE_MONTH_PATTERN));

/**
 * 暦の上に実在する日付。
 *
 * @remarks
 * 書式の照合だけでは通ってしまう日（`2026-06-31` など）を弾きます。実在しない日は繰り上がって
 * 別の日になるため、`z.iso.date()` はそれも不正として扱います。
 */
const dateSchema = singleValue(z.iso.date());

/** 今日から遡る日数。上限は契約が決めるので、`adapters` が公開するものを使う。 */
const daysSchema = singleValue(z.coerce.number().int().min(1).max(PURCHASE_MAX_RECENT_DAYS));

/**
 * 効いている期間の条件を読むスキーマ。
 *
 * @remarks
 * **読めない条件は全期間へ倒します。** URL は利用者が直接編集できるので、区分だけがあって必須の値が
 * 無い URL も、日付として読めない値も届きます。そのまま契約へ渡すと一覧そのものが 400 になり、
 * 画面には何も出せません。倒した結果は入力欄にそのまま現れるので、指定が効いていないことは
 * 画面から読み取れます。
 *
 * 日付の前後関係もここで見ます。終了日が開始日より前の要求は契約が 400 で返すため、渡す前に
 * 落とします。
 */
const periodSchema = z
  .union([
    z
      .object({
        [PERIOD_KEY.PERIOD]: singleValue(z.literal("month")),
        [PERIOD_KEY.MONTH]: monthSchema,
      })
      .transform((value): PeriodSelection => ({ kind: "month", month: value[PERIOD_KEY.MONTH] })),
    z
      .object({
        [PERIOD_KEY.PERIOD]: singleValue(z.literal("range")),
        [PERIOD_KEY.FROM]: dateSchema,
        [PERIOD_KEY.TO]: dateSchema,
      })
      .refine((value) => value[PERIOD_KEY.FROM] <= value[PERIOD_KEY.TO])
      .transform(
        (value): PeriodSelection => ({
          kind: "range",
          from: value[PERIOD_KEY.FROM],
          to: value[PERIOD_KEY.TO],
        }),
      ),
    z
      .object({
        [PERIOD_KEY.PERIOD]: singleValue(z.literal("recent")),
        [PERIOD_KEY.DAYS]: daysSchema,
      })
      .transform((value): PeriodSelection => ({ kind: "recent", days: value[PERIOD_KEY.DAYS] })),
  ])
  .catch(ALL_PERIOD);

/**
 * 素の `searchParams` から、効いている期間の条件を読む。
 *
 * @remarks
 * 判定は {@link periodSchema} が持ちます（`docs/rules.md` #42）。区分ごとに必須の値が違うため、
 * 区分ごとの姿を並べて照らします。手で条件を並べると、区分と値の組み合わせのうちどれを見ていないのかが
 * 読み取れません。
 */
export function toPeriodSelection(params: RawSearchParams): PeriodSelection {
  return periodSchema.parse(params);
}
