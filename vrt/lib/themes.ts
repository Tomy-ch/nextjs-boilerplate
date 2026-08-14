// 撮る配色テーマ。撮る側(`playwright.config.ts` の projects)と、在るべき基準画像を数える側
// ([orphan-baselines](orphan-baselines.ts))が読む唯一の宣言。

/** 撮る配色テーマ。Playwright の project 名であり、基準画像を分けるディレクトリ名。 */
export const THEMES = ["light", "dark"] as const;
