import { describe, expect, it } from "vitest";

import { translationPairsOf } from "./translation-pairs";

describe("translationPairsOf", () => {
  // ----- 正常系 -----
  it("兄弟の canonical を持つミラーを組にする", () => {
    expect(translationPairsOf(["docs/rules.md", "docs/rules.ja.md"])).toEqual([
      { canonical: "docs/rules.md", translation: "docs/rules.ja.md" },
    ]);
  });

  it("ミラーの側の綴りで並べる", () => {
    const tracked = ["b.md", "b.ja.md", "a/README.md", "a/README.ja.md"];

    expect(translationPairsOf(tracked).map(({ translation }) => translation)).toEqual([
      "a/README.ja.md",
      "b.ja.md",
    ]);
  });

  it("ミラーを持たない canonical は組にしない", () => {
    expect(translationPairsOf(["docs/rules.md", "docs/playbook.md"])).toEqual([]);
  });

  // ----- 異常系 -----
  it("canonical の無いミラーは組にしない", () => {
    expect(translationPairsOf(["docs/orphan.ja.md"])).toEqual([]);
  });

  it("別のディレクトリにある同名の canonical とは組にしない", () => {
    expect(translationPairsOf(["docs/rules.ja.md", "rules.md"])).toEqual([]);
  });

  it("名前に ja を含むだけの canonical をミラーと取り違えない", () => {
    expect(translationPairsOf(["ninja.md", "ja.md"])).toEqual([]);
  });
});
