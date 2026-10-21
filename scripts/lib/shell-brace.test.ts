import { describe, expect, it } from "vitest";

import { findBareVariables, formatBareVariables } from "./shell-brace";

describe("findBareVariables", () => {
  // ----- 正常系 -----
  it("囲んだ変数は見つけない", () => {
    expect(findBareVariables("a.sh", ['echo "$', '{NAME}（完了）"'].join(""))).toEqual([]);
  });

  it("うしろが半角なら、裸のままでも見つけない", () => {
    expect(findBareVariables("a.sh", 'echo "$NAME done"')).toEqual([]);
    expect(findBareVariables("a.sh", 'echo "$NAME)"')).toEqual([]);
  });

  it("裸の変数の直後に全角が続く箇所を、行とともに返す", () => {
    expect(findBareVariables("a.sh", ['echo "先頭"', 'echo "件数は$COUNT件"'].join("\n"))).toEqual([
      { file: "a.sh", line: 2, variable: "$COUNT" },
    ]);
  });

  it("Make の `$$NAME` も同じ形として見つける", () => {
    expect(findBareVariables("a.mk", 'echo "配信元: $$BRANCH（既定）"')).toEqual([
      { file: "a.mk", line: 1, variable: "$BRANCH" },
    ]);
  });

  it("1 行に 2 つあれば 2 件返す", () => {
    expect(findBareVariables("a.sh", 'echo "$A、$B。"')).toEqual([
      { file: "a.sh", line: 1, variable: "$A" },
      { file: "a.sh", line: 1, variable: "$B" },
    ]);
  });

  // ----- 異常系 -----
  it("変数でない `$` を拾わない", () => {
    expect(findBareVariables("a.sh", 'echo "$ 円"')).toEqual([]);
    expect(findBareVariables("a.sh", 'echo "$1 番"')).toEqual([]);
  });

  it("空のファイルを 0 件で返す", () => {
    expect(findBareVariables("a.sh", "")).toEqual([]);
  });
});

describe("formatBareVariables", () => {
  // ----- 正常系 -----
  it("1 行 1 件で組む", () => {
    expect(
      formatBareVariables([
        { file: "a.sh", line: 2, variable: "$COUNT" },
        { file: "b.mk", line: 9, variable: "$BRANCH" },
      ]),
    ).toBe(
      ["a.sh:2 — $COUNT を `$", "{…}` で囲む\nb.mk:9 — $BRANCH を `$", "{…}` で囲む"].join(""),
    );
  });

  // ----- 異常系 -----
  it("0 件なら空文字を返す", () => {
    expect(formatBareVariables([])).toBe("");
  });
});
