import { describe, expect, it } from "vitest";

import { type BreakpointName, mediaBelow } from "./breakpoint";
import { BREAKPOINT } from "./generated/breakpoint";

const NAMES: readonly BreakpointName[] = ["sm", "md", "lg", "xl", "2xl"];

describe("mediaBelow", () => {
  // ----- 正常系 -----
  it("その段に達していない幅を表す", () => {
    expect(mediaBelow("lg")).toBe("not all and (min-width: 64rem)");
  });

  it("段の幅は design token から引く", () => {
    expect(mediaBelow("md")).toContain(BREAKPOINT.md);
  });

  it("どの段でも同じ形で組む", () => {
    const queries = NAMES.map((name) => mediaBelow(name));

    expect(queries.every((query) => query.startsWith("not all and (min-width: "))).toBe(true);
  });

  it("生成された段をすべて網羅している", () => {
    expect(NAMES).toEqual(Object.keys(BREAKPOINT));
  });
});
