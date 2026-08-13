// 撮る配色テーマ。Playwright の project 名であり、基準画像を分けるディレクトリ名でもある。
//
// 撮る側(`playwright.config.ts` の projects)と、在るべき基準画像を数える側
// ([orphan-baselines](orphan-baselines.ts))が同じ一覧を読む。2 箇所に綴ると、テーマを増減
// させたときに片方だけが動き、増えた側は撮られず、減った側は孤児として残る。

/** 撮る配色テーマ。dark は token の切り替えでしか出ない見た目で、他に機械検証する層が無い。 */
export const THEMES = ["light", "dark"] as const;
