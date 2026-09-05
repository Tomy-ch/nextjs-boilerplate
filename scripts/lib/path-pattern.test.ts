import { describe, expect, it } from "vitest";

import { toPathPattern } from "./path-pattern";

describe("toPathPattern", () => {
  // ----- 正常系 -----
  it("`**` を 0 段以上のディレクトリとして扱う", () => {
    const pattern = toPathPattern("src/app/**/route.ts");

    expect(pattern.test("src/app/route.ts")).toBe(true);
    expect(pattern.test("src/app/api/route.ts")).toBe(true);
    expect(pattern.test("src/app/api/auth/login/route.ts")).toBe(true);
  });

  it("`*` は区切りを跨がない", () => {
    const pattern = toPathPattern("src/*/index.ts");

    expect(pattern.test("src/model/index.ts")).toBe(true);
    expect(pattern.test("src/model/settings/index.ts")).toBe(false);
  });

  it("`*` はセグメントの一部にも書ける", () => {
    const pattern = toPathPattern("src/app/**/route.*.ts");

    expect(pattern.test("src/app/dev/route.dev.ts")).toBe(true);
    expect(pattern.test("src/app/dev/route.ts")).toBe(false);
  });

  it("正規表現のメタ文字を文字として照合する", () => {
    const pattern = toPathPattern("docs/spec/[id]/page.md");

    expect(pattern.test("docs/spec/[id]/page.md")).toBe(true);
    // 文字クラスとして解釈されていれば、`i` の 1 文字にも当たってしまう。
    expect(pattern.test("docs/spec/i/page.md")).toBe(false);
  });

  it("先頭から末尾まで一致することを求める", () => {
    const pattern = toPathPattern("src/app/**/route.ts");

    expect(pattern.test("vendor/src/app/route.ts")).toBe(false);
    expect(pattern.test("src/app/route.ts.bak")).toBe(false);
  });

  // ----- 異常系 -----
  it("末尾が `**` のパターンを受け付けない", () => {
    expect(() => toPathPattern("src/app/**")).toThrow("末尾が ** のパターンは受け付けません");
  });
});
