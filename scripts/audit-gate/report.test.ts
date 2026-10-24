import { describe, expect, it } from "vitest";

import type { Advisory } from "./advisories";
import { renderReport } from "./report";

const NONE: ReadonlySet<string> = new Set();

function advisory(overrides: Partial<Advisory> = {}): Advisory {
  return {
    id: "GHSA-r28c-9q8g-f849",
    module: "postcss",
    severity: "high",
    title: "PostCSS: Path Traversal",
    url: "https://github.com/advisories/GHSA-r28c-9q8g-f849",
    patched: ">=8.5.18",
    paths: [".>next>postcss"],
    ...overrides,
  };
}

describe("renderReport", () => {
  // ----- 正常系 -----
  it("検出が無いことを述べる", () => {
    expect(renderReport([], NONE)).toBe("検出はありません。");
  });

  it("止めているものを件数つきの見出しで先に出す", () => {
    const body = renderReport([advisory({ severity: "moderate" }), advisory()], NONE);

    expect(body.indexOf("### 止めているもの（1 件）")).toBeLessThan(
      body.indexOf("### 止めないもの（1 件）"),
    );
  });

  it("止めているものが無ければその見出しを出さない", () => {
    expect(renderReport([advisory({ severity: "moderate" })], NONE)).not.toContain(
      "### 止めているもの",
    );
  });

  it("止めないものが無ければその見出しを出さない", () => {
    expect(renderReport([advisory()], NONE)).not.toContain("### 止めないもの");
  });

  it("修正版を範囲のまま出す", () => {
    expect(renderReport([advisory()], NONE)).toContain("| high | `postcss` | `>=8.5.18` |");
  });

  it("修正版が無いことを強調して出す", () => {
    expect(renderReport([advisory({ patched: undefined })], NONE)).toContain("**修正版なし**");
  });

  it("見出しを advisory への link にする", () => {
    expect(renderReport([advisory()], NONE)).toContain(
      "[PostCSS: Path Traversal](https://github.com/advisories/GHSA-r28c-9q8g-f849)",
    );
  });

  it("経路を 3 件まで並べ、残りを件数で畳む", () => {
    const paths = ["a", "b", "c", "d", "e"];

    expect(renderReport([advisory({ paths })], NONE)).toContain("`a`, `b`, `c` ほか 2 件");
  });

  it("ちょうど 3 件の経路を畳まずに並べる", () => {
    expect(renderReport([advisory({ paths: ["a", "b", "c"] })], NONE)).toContain("`a`, `b`, `c` |");
  });

  it("抑止しているものを、止めるものとも止めないものとも分けて出す", () => {
    const body = renderReport(
      [advisory(), advisory({ id: "GHSA-0000-0000-0000", module: "zod" })],
      new Set(["GHSA-0000-0000-0000"]),
    );

    expect(body).toContain("### 止めているもの（1 件）");
    expect(body).toContain("### 抑止しているもの（1 件）");
    expect(body).not.toContain("### 止めないもの");
  });

  it("抑止しているものが無ければその見出しを出さない", () => {
    expect(renderReport([advisory()], NONE)).not.toContain("### 抑止しているもの");
  });

  it("経路を持たない検出を — で示す", () => {
    expect(renderReport([advisory({ paths: [] })], NONE)).toContain("| — |");
  });
});
