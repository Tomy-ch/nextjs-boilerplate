// 画面単位の a11y 検査で無効にする axe のルール。無効化の宣言はここだけが持つ —— spec 側で
// `rules: { ... }` を書けるようにすると、画面を足した人がその場で黙らせられる
// （story 側の [vrt/lib/a11y-rules.ts](../../vrt/lib/a11y-rules.ts) と同じ立て方）。
//
// 適合目標と、タグ指定の副作用で有効化されるものの打ち消しは story 側と共有する。目標は
// 1 つの決定（[0100](../../docs/adr/0100-accessibility-target.md)）であり、検査地点ごとに
// 別の水準を持つと、どちらが正なのかが読めなくなる。
import { CONFORMANCE_TAGS, DEFAULT_OFF_RULES, type DisabledRule } from "../../vrt/lib/a11y-rules";

export { CONFORMANCE_TAGS };

/**
 * story では原理的に成立せず、ここで初めて見られるルール。
 *
 * @remarks
 * story は部品を単独で描くため、内容を包む landmark も `main` も h1 も持てません。この 3 つは
 * **画面を組み上げてはじめて壊れる**種類で、部品をいくら足しても鳴りません。
 *
 * 配信される document 水準（`html-has-lang` / `document-title`）も同じ事情です。story は
 * Storybook の iframe document の中で描かれるため、あちらが評価しているのは Storybook の器で
 * あって `src/app/layout.tsx` ではありません。
 *
 * この並びは検査するルールの列挙ではなく、**「なぜここに検査が要るのか」の記録**です。実際に
 * 走るのは {@link CONFORMANCE_TAGS} に一致する全ルールから {@link screenDisabledRuleIds} を
 * 引いたものなので、ここへ足しても走るルールは変わりません。
 */
export const SCREEN_ONLY_RULES = [
  "region",
  "page-has-heading-one",
  "landmark-one-main",
  "html-has-lang",
  "document-title",
] as const;

/** 画面を名指しして外すルール 1 件。 */
export type ScreenDisabledRule = DisabledRule & {
  /** 対象の画面の名前（`e2e/lib/screens.ts` の `name`）。 */
  readonly screens: readonly string[];
};

/**
 * 画面を名指しして無効にするルール。
 *
 * @remarks
 * 全画面で外すほどの理由は無いが、その画面では鳴らしても直しようがないものを置きます。
 * 使う側の実装ではなく**取り除けない上流の実装が原因で、かつ実際には到達できない**ことが
 * 条件で、根拠は宣言そのものが持ちます。
 *
 * **「いまは直せない」は理由になりません。** 画面の違反は画面を直して消します。
 */
export const SCREEN_DISABLED_RULES: readonly ScreenDisabledRule[] = [];

/** axe へ渡す形へ畳む。`screenName` を渡すと、その画面を名指しした宣言も併せて外す。 */
export function screenDisabledRuleIds(
  screenName?: string,
  rules: readonly DisabledRule[] = DEFAULT_OFF_RULES,
  screenRules: readonly ScreenDisabledRule[] = SCREEN_DISABLED_RULES,
): string[] {
  const named =
    screenName === undefined
      ? []
      : screenRules.filter((rule) => rule.screens.includes(screenName)).map((rule) => rule.id);

  return [...new Set([...rules.map((rule) => rule.id), ...named])];
}
