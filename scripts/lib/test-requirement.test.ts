import { describe, expect, it } from "vitest";

import { findUndeclaredDirectories, resolveTestRequirement } from "./test-requirement";

/** 指定したディレクトリだけが README を持つ読み手を作る。 */
function readerOf(readmes: Readonly<Record<string, string>>) {
  return (directory: string): string | null => readmes[directory] ?? null;
}

function frontmatter(declaration: string): string {
  return `---\n${declaration}\n---\n\n# 見出し\n`;
}

describe("resolveTestRequirement", () => {
  // ----- 正常系 -----
  it("同じディレクトリの宣言を引く", () => {
    const resolved = resolveTestRequirement(
      "src/model/money.test.ts",
      readerOf({ "src/model": frontmatter("test-requirement: unit") }),
    );

    expect(resolved).toEqual({ declaredIn: "src/model/README.md", layers: ["unit"] });
  });

  it("Route Handler のテストは、`api/` の外に居ても element の宣言を引く", () => {
    const resolved = resolveTestRequirement(
      "src/app/dev/session/authorize/route.dev.test.ts",
      readerOf({ "src/app": frontmatter("test-requirement: route") }),
    );

    expect(resolved).toEqual({ declaredIn: "architecture.ts", layers: ["integration"] });
  });

  it("element の宣言は、同じディレクトリの README より先に効く", () => {
    const resolved = resolveTestRequirement(
      "src/app/api/products/route.test.ts",
      readerOf({ "src/app/api/products": frontmatter("test-requirement: route") }),
    );

    expect(resolved).toEqual({ declaredIn: "architecture.ts", layers: ["integration"] });
  });

  it("element に当たらない同じディレクトリのテストは、README の宣言を引く", () => {
    const resolved = resolveTestRequirement(
      "src/app/dev/session/to-session-input.test.ts",
      readerOf({ "src/app": frontmatter("test-requirement: route") }),
    );

    expect(resolved).toEqual({ declaredIn: "src/app/README.md", layers: ["route"] });
  });

  it("宣言が無いディレクトリからは、遡って最初に宣言を持つ README を引く", () => {
    const resolved = resolveTestRequirement(
      "src/features/cart/ui/panel/panel.test.tsx",
      readerOf({ "src/features": frontmatter("test-requirement: feature") }),
    );

    expect(resolved).toEqual({ declaredIn: "src/features/README.md", layers: ["feature"] });
  });

  it("宣言を持たない README は素通しし、その上の宣言を引く", () => {
    const resolved = resolveTestRequirement(
      "src/model/rich-text/sanitize.test.ts",
      readerOf({
        "src/model": frontmatter("test-requirement: unit"),
        "src/model/rich-text": "# rich-text\n",
      }),
    );

    expect(resolved).toEqual({ declaredIn: "src/model/README.md", layers: ["unit"] });
  });

  it("並びで宣言された層をすべて引く", () => {
    const resolved = resolveTestRequirement(
      "docs-viewer/src/search/search-corpus.test.ts",
      readerOf({ "docs-viewer": frontmatter("test-requirement: [unit, component]") }),
    );

    expect(resolved?.layers).toEqual(["unit", "component"]);
  });

  it("リポジトリ直下の README が持つ宣言も引く", () => {
    const resolved = resolveTestRequirement(
      "tool.test.ts",
      readerOf({ "": frontmatter("test-requirement: unit") }),
    );

    expect(resolved).toEqual({ declaredIn: "README.md", layers: ["unit"] });
  });

  it("README を持てない起動エントリの宣言は ADR から引く", () => {
    const resolved = resolveTestRequirement("src/proxy.test.ts", readerOf({}));

    expect(resolved).toEqual({
      declaredIn: "docs/adr/0090-testing-strategy.md",
      layers: ["unit"],
    });
  });

  // ----- 異常系 -----
  it("遡っても宣言が無ければ null を返す", () => {
    expect(resolveTestRequirement("vrt/lib/clock.test.ts", readerOf({}))).toBeNull();
  });

  it("frontmatter を持たない README は宣言として読まない", () => {
    expect(
      resolveTestRequirement("tokens/gen.test.ts", readerOf({ tokens: "# tokens\n" })),
    ).toBeNull();
  });

  it("frontmatter に test-requirement が無ければ宣言として読まない", () => {
    const resolved = resolveTestRequirement(
      "src/adapters/gen.test.ts",
      readerOf({ "src/adapters": frontmatter("imports-allowed: [model]") }),
    );

    expect(resolved).toBeNull();
  });

  it("層として読めない語だけの宣言は、空の並びとして返す", () => {
    const resolved = resolveTestRequirement(
      "mocks/handlers.test.ts",
      readerOf({ mocks: frontmatter("test-requirement: visual") }),
    );

    expect(resolved).toEqual({ declaredIn: "mocks/README.md", layers: [] });
  });
});

describe("findUndeclaredDirectories", () => {
  // ----- 正常系 -----
  it("宣言を引けたテストしか無ければ空を返す", () => {
    const undeclared = findUndeclaredDirectories(
      ["src/model/money.test.ts", "src/model/rich-text/sanitize.test.ts"],
      readerOf({ "src/model": frontmatter("test-requirement: unit") }),
    );

    expect(undeclared).toEqual([]);
  });

  it("同じディレクトリに複数のテストがあっても 1 件にまとめる", () => {
    const undeclared = findUndeclaredDirectories(
      ["vrt/lib/clock.test.ts", "vrt/lib/themes.test.ts"],
      readerOf({}),
    );

    expect(undeclared).toEqual(["vrt/lib"]);
  });

  it("引けたものと引けなかったものが混ざっていても、引けなかった側だけを返す", () => {
    const undeclared = findUndeclaredDirectories(
      ["src/model/money.test.ts", "e2e/lib/screens.test.ts"],
      readerOf({ "src/model": frontmatter("test-requirement: unit") }),
    );

    expect(undeclared).toEqual(["e2e/lib"]);
  });

  // ----- 異常系 -----
  it("宣言を引けないテストのディレクトリを返す", () => {
    expect(findUndeclaredDirectories(["tokens/scripts/gen.test.ts"], readerOf({}))).toEqual([
      "tokens/scripts",
    ]);
  });

  it("層として読めない宣言しか無いディレクトリも、引けなかった側へ入れる", () => {
    const undeclared = findUndeclaredDirectories(
      ["mocks/handlers.test.ts"],
      readerOf({ mocks: frontmatter("test-requirement: visual") }),
    );

    expect(undeclared).toEqual(["mocks"]);
  });
});
