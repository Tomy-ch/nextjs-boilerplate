import { describe, expect, it } from "vitest";

import { blockScalarLines } from "./block-scalar";

describe("blockScalarLines", () => {
  // ----- 正常系 -----
  it("リテラルブロックの中身を行番号で返す", () => {
    const source = ["steps:", "  - run: |", "      echo one", "      echo two"].join("\n");

    expect([...blockScalarLines(source)]).toEqual([3, 4]);
  });

  it("折りたたみブロックの中身も対象にする", () => {
    const source = ["steps:", "  - run: >-", "      echo one"].join("\n");

    expect([...blockScalarLines(source)]).toEqual([3]);
  });

  it("chomp と字下げの指示子が付いたヘッダも解釈する", () => {
    const source = ["steps:", "  - run: |2-", "      echo one"].join("\n");

    expect([...blockScalarLines(source)]).toEqual([3]);
  });

  it("字下げがヘッダ以下へ戻った行でブロックを終える", () => {
    const source = ["  - run: |", "      echo one", "  - uses: actions/checkout@v7"].join("\n");

    expect([...blockScalarLines(source)]).toEqual([2]);
  });

  it("ブロックの途中の空行を中身として扱う", () => {
    const source = ["  - run: |", "      echo one", "", "      echo two"].join("\n");

    expect([...blockScalarLines(source)]).toEqual([2, 3, 4]);
  });

  it("複数のブロックをそれぞれ独立に扱う", () => {
    const source = [
      "  - run: |",
      "      echo one",
      "  - name: X",
      "  - run: |",
      "      echo two",
    ].join("\n");

    expect([...blockScalarLines(source)]).toEqual([2, 5]);
  });

  // ----- 異常系 -----
  it("ヘッダ行そのものを中身に含めない", () => {
    const source = ["  - run: |", "      echo one"].join("\n");

    expect(blockScalarLines(source).has(1)).toBe(false);
  });

  it("ブロックスカラーを持たない内容では空を返す", () => {
    const source = ["steps:", "  - uses: actions/checkout@v7"].join("\n");

    expect([...blockScalarLines(source)]).toEqual([]);
  });

  it("値が同じ行にある通常のスカラーをヘッダとして扱わない", () => {
    const source = ["  - run: echo one", "      継続に見える行"].join("\n");

    expect([...blockScalarLines(source)]).toEqual([]);
  });
});
