import { parse as parseToml } from "smol-toml";
import { z } from "zod";

/**
 * `osv-scanner.toml` の抑止を、このゲートでも効かせる。
 *
 * @remarks
 * 依存の脆弱性の抑止は `osv-scanner.toml` の 1 か所に置きます。`pnpm audit` には抑止の仕組みが
 * 無く、別の置き場を作ると、同じ脆弱性の許容を 2 か所で書き揃えることになります。
 *
 * **期限（`ignoreUntil`）を過ぎた抑止は効かせません。** osv-scanner と同じ扱いで、過ぎたら
 * ゲートが止めて再判断を求めます。
 */

/** `osv-scanner.toml` の抑止 1 件。判定に使う欄だけを受け取る。 */
const ignoredVulnSchema = z.object({
  id: z.string(),
  ignoreUntil: z.date().optional(),
});

/**
 * `osv-scanner.toml` の全体。
 *
 * @remarks
 * `IgnoredVulns` を optional にしてあるのは、抑止が 1 件も無い設定が正しい形だからです。
 */
const osvConfigSchema = z.object({
  IgnoredVulns: z.array(ignoredVulnSchema).optional(),
});

/**
 * いま効いている抑止の ID を読む。
 *
 * @param text - `osv-scanner.toml` の中身。
 * @param now - 期限と比べる時刻。
 * @returns 期限が来ていない抑止の ID。
 * @throws 形が合わない場合。抑止が読めないまま空として扱うと、許容したはずの検出でゲートが止まる
 *   理由が分からなくなる。
 */
export function parseSuppressions(text: string, now: Date): ReadonlySet<string> {
  const parsed = osvConfigSchema.parse(parseToml(text));

  return new Set(
    (parsed.IgnoredVulns ?? [])
      .filter(({ ignoreUntil }) => ignoreUntil === undefined || now < ignoreUntil)
      .map(({ id }) => id),
  );
}
