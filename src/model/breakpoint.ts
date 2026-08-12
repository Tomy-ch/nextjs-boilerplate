import { BREAKPOINT } from "./generated/breakpoint";

/** 段の名前。値は design token が持つ。 */
export type BreakpointName = keyof typeof BREAKPOINT;

/**
 * その段に達していない幅を表す media query を組む。
 *
 * @remarks
 * Tailwind の `max-*` variant と同じ形（`not all and (min-width: …)`）にします。`max-width` を
 * 1px 引いて表すと、CSS 側の境界と JS 側の境界が端の 1px でずれます。
 *
 * 幅そのものは design token が持ちます。ここで数値を書くと、段を差し替えたときに CSS 側だけが
 * 追従して両方出る幅か両方消える幅ができます。
 *
 * @param name - 段の名前
 */
export function mediaBelow(name: BreakpointName): string {
  return `not all and (min-width: ${BREAKPOINT[name]})`;
}
