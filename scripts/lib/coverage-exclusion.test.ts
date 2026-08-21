import { describe, expect, it } from "vitest";

import { findExclusionDrift, ownerDirectory, UNOWNED } from "./coverage-exclusion";

/** ディレクトリ → README 本文の対応から reader を組む。 */
function readerOf(readmes: Record<string, string>): (directory: string) => string | null {
  return (directory) => readmes[directory] ?? null;
}

/** frontmatter に除外を記録した README を組む。 */
function recording(...patterns: string[]): string {
  const list = patterns.map((pattern) => `  - "${pattern}"\n`).join("");

  return `---\ncoverage-exclusions:\n${list}---\n\n# 見出し\n`;
}

describe("ownerDirectory", () => {
  // ----- 正常系 -----
  it("起点のディレクトリが README を持つならそこを所有者にする", () => {
    const read = readerOf({ "src/app": "# app" });

    expect(ownerDirectory("src/app/fonts.ts", read)).toBe("src/app");
  });

  it("README が無ければ遡って最初に持つディレクトリを所有者にする", () => {
    const read = readerOf({ src: "# src" });

    expect(ownerDirectory("src/features/cart/deep/thing.ts", read)).toBe("src");
  });

  it("ワイルドカードより前だけを見る", () => {
    // `**` の先は選ぶ範囲であって所在ではない。`src/app` が所有者で、`page.tsx` が実際に置かれた
    // 深さの README は所有者にならない。
    const read = readerOf({ "src/app": "# app", "src/app/admin": "# admin" });

    expect(ownerDirectory("src/app/**/page.tsx", read)).toBe("src/app");
  });

  it("リポジトリ直下の README も所有者になれる", () => {
    const read = readerOf({ "": "# root" });

    expect(ownerDirectory("anything/*.ts", read)).toBe("");
  });

  // ----- 異常系 -----
  it("遡っても README が無ければ所有者を返さない", () => {
    expect(ownerDirectory("src/app/fonts.ts", readerOf({}))).toBeNull();
  });
});

describe("findExclusionDrift", () => {
  // ----- 正常系 -----
  it("宣言と記録が一致していれば何も挙げない", () => {
    const read = readerOf({ "src/app": recording("src/app/fonts.ts") });

    expect(findExclusionDrift(["src/app/fonts.ts"], read)).toEqual([]);
  });

  it("所有者ごとにまとめる", () => {
    const read = readerOf({ "src/app": "# app", vrt: "# vrt" });

    expect(findExclusionDrift(["src/app/fonts.ts", "vrt/lib/settle.ts"], read)).toEqual([
      { directory: "src/app", missing: ["src/app/fonts.ts"], extra: [] },
      { directory: "vrt", missing: ["vrt/lib/settle.ts"], extra: [] },
    ]);
  });

  // ----- 異常系 -----
  it("記録の無い除外を missing へ挙げる", () => {
    const read = readerOf({ "src/app": recording("src/app/fonts.ts") });

    expect(findExclusionDrift(["src/app/fonts.ts", "src/app/other.ts"], read)).toEqual([
      { directory: "src/app", missing: ["src/app/other.ts"], extra: [] },
    ]);
  });

  it("宣言から消えたのに残っている記録を extra へ挙げる", () => {
    const read = readerOf({ "src/app": recording("src/app/fonts.ts", "src/app/gone.ts") });

    expect(findExclusionDrift(["src/app/fonts.ts"], read)).toEqual([
      { directory: "src/app", missing: [], extra: ["src/app/gone.ts"] },
    ]);
  });

  it("記録の行はあるが並びとして読めないものを、記録が無いものとして扱う", () => {
    // 書いたつもりで何も記録できていない状態。素通しすると、書いた側だけが記録済みだと思う。
    const read = readerOf({ "src/app": "---\ncoverage-exclusions:\n---\n\n# app\n" });

    expect(findExclusionDrift(["src/app/fonts.ts"], read)).toEqual([
      { directory: "src/app", missing: ["src/app/fonts.ts"], extra: [] },
    ]);
  });

  it("所有 README を持たない除外をまとめて挙げる", () => {
    expect(findExclusionDrift(["src/app/fonts.ts"], readerOf({}))).toEqual([
      { directory: UNOWNED, missing: ["src/app/fonts.ts"], extra: [] },
    ]);
  });
});
