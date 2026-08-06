/**
 * 系列色を切り替える配色モードと、その CSS 変数を載せる selector の対応。
 *
 * @see Storybook `Display/Chart`
 */
export const CHART_THEME_SELECTORS = [
  ["light", ""],
  ["dark", ".dark"],
] as const satisfies readonly (readonly [string, string])[];

/** {@link CHART_THEME_SELECTORS} が扱う配色モード。 */
export type ChartTheme = (typeof CHART_THEME_SELECTORS)[number][0];

const DOT_CHART_INDICATOR = "dot";
const LINE_CHART_INDICATOR = "line";
const DASHED_CHART_INDICATOR = "dashed";

/**
 * tooltip の各系列に添える印の形を表す定数。
 *
 * @see Storybook `Display/Chart`
 */
export const CHART_INDICATOR: Readonly<{
  DOT: "dot";
  LINE: "line";
  DASHED: "dashed";
}> = {
  DOT: DOT_CHART_INDICATOR,
  LINE: LINE_CHART_INDICATOR,
  DASHED: DASHED_CHART_INDICATOR,
};

/** {@link CHART_INDICATOR} のいずれか。 */
export type ChartIndicator = (typeof CHART_INDICATOR)[keyof typeof CHART_INDICATOR];
