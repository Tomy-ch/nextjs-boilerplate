import { describe, expect, it } from "vitest";

import { numstatArgs, parseNumstat } from "./numstat";

describe("parseNumstat", () => {
  // ----- 正常系 -----
  it("増えた行と減った行を足して数える", () => {
    expect(parseNumstat("12\t3\tsrc/app/page.tsx")).toEqual([
      { path: "src/app/page.tsx", changedLines: 15 },
    ]);
  });

  it("複数行を読む", () => {
    expect(parseNumstat("1\t0\ta.ts\n2\t2\tb.ts")).toEqual([
      { path: "a.ts", changedLines: 1 },
      { path: "b.ts", changedLines: 4 },
    ]);
  });

  it("行数を持たない二進ファイルは 0 として数える", () => {
    expect(parseNumstat("-\t-\tpublic/logo.png")).toEqual([
      { path: "public/logo.png", changedLines: 0 },
    ]);
  });

  it("空の出力なら空を返す", () => {
    expect(parseNumstat("")).toEqual([]);
  });

  // ----- 異常系 -----
  it("列の揃わない行は落とす", () => {
    expect(parseNumstat("こわれた行\n1\t0\ta.ts\n")).toEqual([{ path: "a.ts", changedLines: 1 }]);
  });

  it("列が多すぎる行も落とす", () => {
    expect(parseNumstat("1\t0\tpath\twith\ttab.ts")).toEqual([]);
  });
});

describe("numstatArgs", () => {
  // ----- 正常系 -----
  it("パスの引用とリネームの畳み込みを、どちらも切ってから差分を取る", () => {
    expect(numstatArgs(["origin/main...HEAD"])).toEqual([
      "-c",
      "core.quotePath=false",
      "diff",
      "--numstat",
      "--no-renames",
      "origin/main...HEAD",
    ]);
  });

  it("2 つのコミットを比べる形も渡せる", () => {
    expect(numstatArgs(["origin/main", "HEAD"])).toEqual([
      "-c",
      "core.quotePath=false",
      "diff",
      "--numstat",
      "--no-renames",
      "origin/main",
      "HEAD",
    ]);
  });
});
