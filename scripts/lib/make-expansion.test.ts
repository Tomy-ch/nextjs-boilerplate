import { describe, expect, it } from "vitest";

import { assignedNames, findBareExpansions, formatBareExpansions } from "./make-expansion";

const FILE = "a.mk";
const NOTHING = new Set<string>();

describe("assignedNames", () => {
  // ----- 正常系 -----
  it("代入の形を問わず名前を集める", () => {
    expect([...assignedNames(["A := 1\nB ?= 2\nC = 3\nD += 4"])].sort()).toEqual([
      "A",
      "B",
      "C",
      "D",
    ]);
  });

  it("複数のファイルをまたいで集める", () => {
    expect([...assignedNames(["A := 1", "B := 2"])].sort()).toEqual(["A", "B"]);
  });

  // ----- 異常系 -----
  it("代入でない行から名前を取らない", () => {
    expect([...assignedNames(["\t@echo $(A)\n.PHONY: build"])]).toEqual([]);
  });
});

describe("findBareExpansions", () => {
  // ----- 正常系 -----
  it("代入を持つ変数の展開は、外から来る値ではない", () => {
    expect(findBareExpansions(FILE, "\t@run $(TOOL)", new Set(["TOOL"]))).toEqual([]);
  });

  it("レシピ行でない行は見ない", () => {
    expect(findBareExpansions(FILE, "TOOL := $(ARGS)", NOTHING)).toEqual([]);
  });

  it("`define` の本体は recipe ではない", () => {
    const source = ["define run", "\t@echo $(ARGS)", "endef"].join("\n");

    expect(findBareExpansions(FILE, source, NOTHING)).toEqual([]);
  });

  it("シェルの実行置換を、make の展開と読み違えない", () => {
    expect(findBareExpansions(FILE, "\tREPO=$$(gh repo view)", NOTHING)).toEqual([]);
  });

  it("リテラルだけで絞った `filter` は、値を 2 通りへ有界化する", () => {
    expect(
      findBareExpansions(FILE, '\t@if [ -n "$(filter 1,$(DRY_RUN))" ]; then', NOTHING),
    ).toEqual([]);
  });

  it("make 自身の変数は外から来る値ではない", () => {
    expect(findBareExpansions(FILE, "\t@$(MAKE) build", NOTHING)).toEqual([]);
  });

  it("関数呼び出しそのものを変数と読み違えない", () => {
    expect(findBareExpansions(FILE, "\t@run $(strip x)", NOTHING)).toEqual([]);
  });

  // ----- 異常系 -----
  it("代入を持たない変数の展開を、行とともに返す", () => {
    expect(findBareExpansions(FILE, "\t@run $(ARGS)", NOTHING)).toEqual([
      { file: FILE, line: 1, variable: "ARGS" },
    ]);
  });

  it("1 行に 2 つあれば 2 件返す", () => {
    expect(findBareExpansions(FILE, "\t@run $(A) $(B)", NOTHING)).toEqual([
      { file: FILE, line: 1, variable: "A" },
      { file: FILE, line: 1, variable: "B" },
    ]);
  });

  it("`%` を持つ `filter` は有界化と見なさない", () => {
    expect(findBareExpansions(FILE, "\t@run $(filter 1/%,$(SHARD))", NOTHING)).toEqual([
      { file: FILE, line: 1, variable: "SHARD" },
    ]);
  });

  it("`endef` の後は、また recipe を見る", () => {
    const source = ["define run", "\t@echo x", "endef", "build:", "\t@run $(ARGS)"].join("\n");

    expect(findBareExpansions(FILE, source, NOTHING)).toEqual([
      { file: FILE, line: 5, variable: "ARGS" },
    ]);
  });
});

describe("formatBareExpansions", () => {
  // ----- 正常系 -----
  it("1 行 1 件で組む", () => {
    expect(
      formatBareExpansions([
        { file: "a.mk", line: 2, variable: "ARGS" },
        { file: "b.mk", line: 9, variable: "SHARD" },
      ]),
    ).toBe("a.mk:2 — ARGS を export で渡す\nb.mk:9 — SHARD を export で渡す");
  });

  // ----- 異常系 -----
  it("0 件なら空文字を返す", () => {
    expect(formatBareExpansions([])).toBe("");
  });
});
