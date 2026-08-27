import { describe, expect, it } from "vitest";

import { extractFrontmatter, parseFrontmatter } from "./frontmatter";

describe("extractFrontmatter", () => {
  // ----- 正常系 -----
  it("先頭の区切りに挟まれたブロックを本文として返す", () => {
    expect(extractFrontmatter("---\ntest-requirement: unit\n---\n\n# 見出し\n")).toBe(
      "test-requirement: unit",
    );
  });

  it("改行が CRLF でも取り出す", () => {
    expect(extractFrontmatter("---\r\ntest-requirement: unit\r\n---\r\n# 見出し\r\n")).toBe(
      "test-requirement: unit",
    );
  });

  it("ブロックだけで本文が続かなくても取り出す", () => {
    expect(extractFrontmatter("---\ntest-requirement: unit\n---")).toBe("test-requirement: unit");
  });

  // ----- 異常系 -----
  it("frontmatter を持たない文書では null を返す", () => {
    expect(extractFrontmatter("# 見出し\n\n本文\n")).toBeNull();
  });

  it("先頭以外にある区切りは frontmatter として扱わない", () => {
    expect(extractFrontmatter("# 見出し\n\n---\ntest-requirement: unit\n---\n")).toBeNull();
  });
});

describe("parseFrontmatter", () => {
  // ----- 正常系 -----
  it("宣言を対応表として返す", () => {
    expect(parseFrontmatter("---\ntest-requirement: unit\n---\n")).toEqual({
      "test-requirement": "unit",
    });
  });

  it("並びで書かれた宣言をそのまま並びとして返す", () => {
    expect(parseFrontmatter("---\ntest-requirement: [unit, component]\n---\n")).toEqual({
      "test-requirement": ["unit", "component"],
    });
  });

  it("引用符で囲まれた値も同じ値として読む", () => {
    expect(parseFrontmatter('---\ntest-requirement: "unit"\n---\n')).toEqual({
      "test-requirement": "unit",
    });
  });

  // ----- 異常系 -----
  it("frontmatter を持たない文書では null を返す", () => {
    expect(parseFrontmatter("# 見出し\n")).toBeNull();
  });

  it("YAML として解けない frontmatter は宣言が無いものとして扱う", () => {
    expect(parseFrontmatter("---\ntest-requirement: [unit\n---\n")).toBeNull();
  });

  it("本文が null に解ける frontmatter は宣言が無いものとして扱う", () => {
    expect(parseFrontmatter("---\nnull\n---\n")).toBeNull();
  });

  it("対応表にならない frontmatter は宣言が無いものとして扱う", () => {
    expect(parseFrontmatter("---\n- unit\n- component\n---\n")).toBeNull();
  });
});
