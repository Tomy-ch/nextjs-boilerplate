// 配色テーマの宣言。撮る側(`playwright.config.ts` の projects)と、在るべき基準画像を数える側
// ([expected-baselines](expected-baselines.ts))が読む唯一の宣言。
//
// 「在るテーマ」と「全 story を撮るテーマ」は別物である。全 story を 2 テーマぶん撮ると
// 実行が倍になるので、撮るのは片方だけにし、もう片方は `:root` に配色が届いているかだけを
// 見る([theme-tokens.spec.ts](../theme-tokens.spec.ts))。

/** 在る配色テーマ。Playwright の project 名。 */
export const THEMES = ["light", "dark"] as const;

/**
 * 全 story を撮り、axe を掛けるテーマ。基準画像を分けるディレクトリ名でもある。
 *
 * @remarks
 * 明るい面を選ぶのは、基準画像を人が承認する場（置き場の compare ビュー）が明るく、暗い画像の
 * 差分は読み取りづらいためです。`:root` の既定が light である側でもあります。
 */
export const SHOT_THEMES = ["light"] as const;
