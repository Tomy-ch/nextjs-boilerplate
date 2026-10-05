import { describe, expect, it } from "vitest";

import { canonicalOf, isMirror, mirrorOf } from "./mirror";

describe("isMirror", () => {
  // ----- 正常系 -----
  it("兄弟の `.ja.md` はミラーである", () => {
    expect(isMirror("docs/adr/0140-documentation-operations.ja.md")).toBe(true);
  });

  // ----- 異常系 -----
  it.each([
    "docs/adr/0140-documentation-operations.md",
    "docs/ja.md",
    "docs/readme.ja",
    "docs/readme.ja.mdx",
  ])("ミラーの接尾辞で終わらないもの（%s）はミラーでない", (path) => {
    expect(isMirror(path)).toBe(false);
  });
});

describe("mirrorOf", () => {
  // ----- 正常系 -----
  it("canonical の兄弟の `.ja.md` を返す", () => {
    expect(mirrorOf("scripts/README.md")).toBe("scripts/README.ja.md");
  });

  // ----- 異常系 -----
  it("Markdown でなければ null を返す", () => {
    expect(mirrorOf("scripts/setup")).toBeNull();
  });

  it("すでにミラーであれば null を返す", () => {
    expect(mirrorOf("scripts/README.ja.md")).toBeNull();
  });
});

describe("canonicalOf", () => {
  // ----- 正常系 -----
  it("ミラーの兄弟の canonical を返す", () => {
    expect(canonicalOf(".claude/skills/commit/SKILL.ja.md")).toBe(".claude/skills/commit/SKILL.md");
  });

  it("mirrorOf と往復すると元のパスに戻る", () => {
    expect(canonicalOf(mirrorOf("docs/rules.md") ?? "")).toBe("docs/rules.md");
  });

  // ----- 異常系 -----
  it("ミラーでなければ null を返す", () => {
    expect(canonicalOf("docs/rules.md")).toBeNull();
  });
});
