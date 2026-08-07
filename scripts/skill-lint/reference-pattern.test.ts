import { describe, expect, it } from "vitest";

import {
  expandBraces,
  isTooComplex,
  placeholderToRegExp,
  scanInlineCode,
  WILDCARD_RE,
} from "./reference-pattern";

describe("isTooComplex", () => {
  // ----- 正常系 -----
  it("上限内のワイルドカードとブレースを通す", () => {
    expect(isTooComplex("src/**/*.ts")).toBe(false);
    expect(isTooComplex("scripts/{a,b}/index.ts")).toBe(false);
  });

  // ----- 異常系 -----
  it("ワイルドカードを並べた表記を複雑すぎると判断する", () => {
    expect(isTooComplex("*".repeat(9).split("").join("/"))).toBe(true);
  });

  it("ブレースの組み合わせが爆発する表記を複雑すぎると判断する", () => {
    expect(isTooComplex("{a,b,c,d}{a,b,c,d}{a,b,c,d}{a,b,c,d}")).toBe(true);
  });
});

describe("expandBraces", () => {
  // ----- 正常系 -----
  it("1 組のブレースを候補へ展開する", () => {
    expect(expandBraces("a.{ts,tsx}")).toEqual(["a.ts", "a.tsx"]);
  });

  it("入れ子でない複数のブレースを組み合わせへ展開する", () => {
    expect(expandBraces("{a,b}.{ts,js}")).toEqual(["a.ts", "a.js", "b.ts", "b.js"]);
  });

  // ----- 異常系 -----
  it("ブレースを持たない表記はそのまま 1 件で返す", () => {
    expect(expandBraces("scripts/index.ts")).toEqual(["scripts/index.ts"]);
  });
});

describe("WILDCARD_RE", () => {
  // ----- 正常系 -----
  it("ワイルドカードとプレースホルダの記号に当たる", () => {
    expect(WILDCARD_RE.test("src/*.ts")).toBe(true);
    expect(WILDCARD_RE.test("scripts/<tool>/index.ts")).toBe(true);
  });

  // ----- 異常系 -----
  it("記号を持たない表記には当たらない", () => {
    expect(WILDCARD_RE.test("scripts/index.ts")).toBe(false);
  });
});

describe("placeholderToRegExp", () => {
  // ----- 正常系 -----
  it("区切りを見る指定では `*` を 1 セグメント内に閉じる", () => {
    const pattern = placeholderToRegExp("scripts/*/index.ts", { segmentSeparator: true });

    expect(pattern.test("scripts/semver/index.ts")).toBe(true);
    expect(pattern.test("scripts/a/b/index.ts")).toBe(false);
  });

  it("区切りを見ない指定では `*` が階層を跨ぐ", () => {
    const pattern = placeholderToRegExp("scripts/*/index.ts", { segmentSeparator: false });

    expect(pattern.test("scripts/a/b/index.ts")).toBe(true);
  });

  it("区切りが続く `**` は 0 階層以上として扱う", () => {
    const pattern = placeholderToRegExp("src/**/x.ts", { segmentSeparator: true });

    expect(pattern.test("src/x.ts")).toBe(true);
    expect(pattern.test("src/a/b/x.ts")).toBe(true);
  });

  it("区切りが続かない `**` は階層を跨ぐ任意文字列として扱う", () => {
    const pattern = placeholderToRegExp("src/**x.ts", { segmentSeparator: true });

    expect(pattern.test("src/a/b-x.ts")).toBe(true);
  });

  it("`<name>` を書き手が埋める 1 セグメントとして扱う", () => {
    const pattern = placeholderToRegExp("scripts/<tool>/index.ts", { segmentSeparator: true });

    expect(pattern.test("scripts/semver/index.ts")).toBe(true);
  });

  // ----- 異常系 -----
  it("閉じない `<` はそのままの文字として扱う", () => {
    const pattern = placeholderToRegExp("scripts/<tool", { segmentSeparator: true });

    expect(pattern.test("scripts/<tool")).toBe(true);
  });
});

describe("scanInlineCode", () => {
  // ----- 正常系 -----
  it("コードスパンの中身と、それを除いた残りへ分ける", () => {
    const { spans, withoutCode } = scanInlineCode("先頭 `scripts/index.ts` 末尾");

    expect(spans).toEqual(["scripts/index.ts"]);
    expect(withoutCode).not.toContain("scripts/index.ts");
  });

  it("同じ長さのバッククォート列だけを閉じとして扱う", () => {
    const { spans } = scanInlineCode("`` `x` ``");

    expect(spans).toEqual(["`x`"]);
  });

  it("1 行に並ぶ複数のスパンをすべて取り出す", () => {
    expect(scanInlineCode("`a` と `b`").spans).toEqual(["a", "b"]);
  });

  // ----- 異常系 -----
  it("閉じないスパンは中身として取り出さない", () => {
    const { spans, withoutCode } = scanInlineCode("先頭 `閉じない");

    expect(spans).toEqual([]);
    expect(withoutCode).toContain("閉じない");
  });

  it("コードスパンを持たない行はそのまま残る", () => {
    const { spans, withoutCode } = scanInlineCode("ただの本文");

    expect(spans).toEqual([]);
    expect(withoutCode).toBe("ただの本文");
  });
});
