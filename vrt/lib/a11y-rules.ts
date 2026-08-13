/**
 * story の a11y 検査で無効にする axe のルール。
 *
 * @remarks
 * 無効にしてよいのは、**story が部品を単独で描画していることの副作用**として鳴るものだけです。
 * 「いまは直せない」は理由になりません — 直せない違反は
 * [`excluded-stories.ts`](excluded-stories.ts) で story ごと外すか、実装を直します。
 *
 * 宣言を 1 箇所に集めるのは、spec 側で `rules: { ... }` を書けるようにすると、story を足した
 * 人がその場で黙らせられてしまうためです（`untested-modules.ts` と同じ規律）。
 */
export type DisabledRule = {
  /** axe のルール id。 */
  readonly id: string;
  /** 単独描画の副作用であることの説明。 */
  readonly reason: string;
  /** この宣言を落とせる条件。 */
  readonly removeWhen: string;
};

export const DISABLED_RULES: readonly DisabledRule[] = [
  {
    id: "region",
    reason:
      "story は部品だけを描画するので、内容を包む landmark が無い。画面としての landmark 構成は page 単位の検査が持つ責務。",
    removeWhen: "画面単位の a11y 検査が入り、landmark をそちらで見るようになったとき。",
  },
  {
    id: "page-has-heading-one",
    reason: "同上。story に h1 を置くと、部品を組み合わせた画面で h1 が重複する。",
    removeWhen: "同上。",
  },
  {
    id: "landmark-one-main",
    reason: "同上。部品単体に main を置くことはできない。",
    removeWhen: "同上。",
  },
];

/** axe へ渡す形へ畳む。 */
export function disabledRuleIds(rules: readonly DisabledRule[] = DISABLED_RULES): string[] {
  return rules.map((rule) => rule.id);
}
