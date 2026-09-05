import { describe, expect, it } from "vitest";

import { isStripTarget } from "./strip-target";

const EXTENSIONS = [".png", ".woff2"];
const PREFIXES = ["scripts/marker-baseline/"];

describe("isStripTarget", () => {
  // ----- 正常系 -----
  it("通常の本文を読む", () => {
    expect(isStripTarget("docs/adr/README.md", EXTENSIONS, PREFIXES)).toBe(true);
  });

  it("接頭辞が途中まで一致するだけのパスを読む", () => {
    expect(isStripTarget("scripts/marker-baseline-notes.md", EXTENSIONS, PREFIXES)).toBe(true);
  });

  it("拡張子が途中まで一致するだけのパスを読む", () => {
    expect(isStripTarget("public/logo.pngx", EXTENSIONS, PREFIXES)).toBe(true);
  });

  it("宣言が空なら何も外さない", () => {
    expect(isStripTarget("public/logo.png", [], [])).toBe(true);
  });

  // ----- 異常系 -----
  it("マーカーを持てない拡張子を外す", () => {
    expect(isStripTarget("public/logo.png", EXTENSIONS, PREFIXES)).toBe(false);
  });

  it("マーカーをデータとして持つ区画を外す", () => {
    expect(isStripTarget("scripts/marker-baseline/rules.ts", EXTENSIONS, PREFIXES)).toBe(false);
  });
});
