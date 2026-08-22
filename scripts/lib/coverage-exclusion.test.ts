import { describe, expect, it } from "vitest";

import { findExclusionDrift, ownerDirectory, UNOWNED } from "./coverage-exclusion";

/** ディレクトリ → README 本文の対応から、reader と走査結果を組む。 */
function treeOf(readmes: Record<string, string>): {
  read: (directory: string) => string | null;
  directories: string[];
} {
  return {
    read: (directory) => readmes[directory] ?? null,
    directories: Object.keys(readmes),
  };
}

/** frontmatter に除外を記録した README を組む。 */
function recording(...patterns: string[]): string {
  const list = patterns.map((pattern) => `  - "${pattern}"\n`).join("");

  return `---\ncoverage-exclusions:\n${list}---\n\n# 見出し\n`;
}

describe("ownerDirectory", () => {
  // ----- 正常系 -----
  it("起点のディレクトリが README を持つならそこを所有者にする", () => {
    const { read } = treeOf({ "src/app": "# app" });

    expect(ownerDirectory("src/app/fonts.ts", read)).toBe("src/app");
  });

  it("README が無ければ遡って最初に持つディレクトリを所有者にする", () => {
    const { read } = treeOf({ src: "# src" });

    expect(ownerDirectory("src/features/cart/deep/thing.ts", read)).toBe("src");
  });

  it("ワイルドカードより前だけを見る", () => {
    // `**` の先は選ぶ範囲であって所在ではない。`src/app` が所有者で、`page.tsx` が実際に置かれた
    // 深さの README は所有者にならない。
    const { read } = treeOf({ "src/app": "# app", "src/app/admin": "# admin" });

    expect(ownerDirectory("src/app/**/page.tsx", read)).toBe("src/app");
  });

  it("リポジトリ直下の README も所有者になれる", () => {
    const { read } = treeOf({ "": "# root" });

    expect(ownerDirectory("anything/*.ts", read)).toBe("");
  });

  // ----- 異常系 -----
  it("遡っても README が無ければ所有者を返さない", () => {
    expect(ownerDirectory("src/app/fonts.ts", treeOf({}).read)).toBeNull();
  });
});

describe("findExclusionDrift", () => {
  // ----- 正常系 -----
  it("宣言と記録が一致していれば何も挙げない", () => {
    const { read, directories } = treeOf({ "src/app": recording("src/app/fonts.ts") });

    expect(findExclusionDrift(["src/app/fonts.ts"], read, directories)).toEqual([]);
  });

  it("所有者ごとにまとめる", () => {
    const { read, directories } = treeOf({ "src/app": "# app", vrt: "# vrt" });

    expect(
      findExclusionDrift(["src/app/fonts.ts", "vrt/lib/settle.ts"], read, directories),
    ).toEqual([
      { directory: "src/app", missing: ["src/app/fonts.ts"], extra: [] },
      { directory: "vrt", missing: ["vrt/lib/settle.ts"], extra: [] },
    ]);
  });

  it("記録を持たない README は走査に含まれても挙げない", () => {
    const { read, directories } = treeOf({
      "src/app": recording("src/app/fonts.ts"),
      src: "# src",
    });

    expect(findExclusionDrift(["src/app/fonts.ts"], read, directories)).toEqual([]);
  });

  // ----- 異常系 -----
  it("記録の無い除外を missing へ挙げる", () => {
    const { read, directories } = treeOf({ "src/app": recording("src/app/fonts.ts") });

    expect(findExclusionDrift(["src/app/fonts.ts", "src/app/other.ts"], read, directories)).toEqual(
      [{ directory: "src/app", missing: ["src/app/other.ts"], extra: [] }],
    );
  });

  it("宣言から消えたのに残っている記録を extra へ挙げる", () => {
    const { read, directories } = treeOf({
      "src/app": recording("src/app/fonts.ts", "src/app/gone.ts"),
    });

    expect(findExclusionDrift(["src/app/fonts.ts"], read, directories)).toEqual([
      { directory: "src/app", missing: [], extra: ["src/app/gone.ts"] },
    ]);
  });

  it("記録の行はあるが並びとして読めないものを、記録が無いものとして扱う", () => {
    // 書いたつもりで何も記録できていない状態。素通しすると、書いた側だけが記録済みだと思う。
    const { read, directories } = treeOf({
      "src/app": "---\ncoverage-exclusions:\n---\n\n# app\n",
    });

    expect(findExclusionDrift(["src/app/fonts.ts"], read, directories)).toEqual([
      { directory: "src/app", missing: ["src/app/fonts.ts"], extra: [] },
    ]);
  });

  it("除外を 1 つも持たなくなったディレクトリの記録も挙げる", () => {
    // 所有者は最も近い README（`src/app`）で、`src` は除外を 1 つも持たない。それでも記録が
    // 残っていれば、README は在りもしない穴を告げ続ける。
    const { read, directories } = treeOf({ "src/app": "# app", src: recording("src/old.ts") });

    expect(findExclusionDrift(["src/app/fonts.ts"], read, directories)).toEqual([
      { directory: "src", missing: [], extra: ["src/old.ts"] },
      { directory: "src/app", missing: ["src/app/fonts.ts"], extra: [] },
    ]);
  });

  it("宣言がどこからも指していない README の記録も挙げる", () => {
    // 宣言の側から遡ると到達できない位置に記録が残った状態。除外が 1 つ残らず撤去された
    // ディレクトリがこれになり、走査を受け取らないと永久に黙る。
    const { read, directories } = treeOf({
      "src/app": recording("src/app/fonts.ts"),
      vrt: recording("vrt/lib/settle.ts"),
    });

    expect(findExclusionDrift(["src/app/fonts.ts"], read, directories)).toEqual([
      { directory: "vrt", missing: [], extra: ["vrt/lib/settle.ts"] },
    ]);
  });

  it("所有 README を持たない除外をまとめて挙げる", () => {
    const { read, directories } = treeOf({});

    expect(findExclusionDrift(["src/app/fonts.ts"], read, directories)).toEqual([
      { directory: UNOWNED, missing: ["src/app/fonts.ts"], extra: [] },
    ]);
  });
});
