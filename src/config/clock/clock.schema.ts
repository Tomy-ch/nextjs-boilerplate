import { z } from "zod";

/** clock purpose 専用の ENV validator を定義する。 */

const fixedNow = z
  .string()
  .trim()
  .optional()
  .refine((value) => value === undefined || value === "" || !Number.isNaN(Date.parse(value)), {
    error: "ISO 8601 の日時を指定してください",
  })
  .transform((value) => (value === undefined || value === "" ? undefined : value));

/**
 * 画面が読む「いま」を固定する指定を検証する。
 *
 * @remarks
 * **未設定と空文字はどちらも「固定しない」です。** 実時計で動くのが既定であり、固定は検証のために
 * 環境が明示したときだけ効きます。配信する環境の ENV ファイルはこの行を持たない（プラットフォームが
 * 与える変数だけを並べる）ため、欠落を不正として落とすと本番の起動が通りません。
 */
export function fixedNowValidator() {
  return fixedNow;
}

export type ClockEnvironment = {
  CLOCK_FIXED_NOW: z.infer<ReturnType<typeof fixedNowValidator>>;
};
