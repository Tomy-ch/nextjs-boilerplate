import { describe, expect, it } from "vitest";

import { parseOptions, requireOption } from "./cli-options";

describe("parseOptions", () => {
  // ----- 正常系 -----
  it("`--name value` の並びを表に読む", () => {
    expect(parseOptions(["--kind", "story", "--ids", "home,cart"])).toEqual(
      new Map([
        ["kind", "story"],
        ["ids", "home,cart"],
      ]),
    );
  });

  it("並びが空なら空の表を返す", () => {
    expect(parseOptions([])).toEqual(new Map());
  });

  it("同じ名前が 2 度現れたら後を採る", () => {
    expect(parseOptions(["--kind", "story", "--kind", "screen"])).toEqual(
      new Map([["kind", "screen"]]),
    );
  });

  it("値が `--` で始まっていても値として読む", () => {
    expect(parseOptions(["--lead", "--なにか"])).toEqual(new Map([["lead", "--なにか"]]));
  });

  // ----- 異常系 -----
  it("値の無い名前で終わっていれば、並びごと挙げて断る", () => {
    expect(() => parseOptions(["--kind"])).toThrow("引数の並びが読めません: --kind");
  });

  it("名前が `--` で始まっていなければ断る", () => {
    expect(() => parseOptions(["kind", "story"])).toThrow("引数の並びが読めません");
  });
});

describe("requireOption", () => {
  // ----- 正常系 -----
  it("渡されていればその値を返す", () => {
    expect(requireOption(new Map([["kind", "story"]]), "kind")).toBe("story");
  });

  it("空文字も渡された値として扱う", () => {
    expect(requireOption(new Map([["ids", ""]]), "ids")).toBe("");
  });

  // ----- 異常系 -----
  it("渡されていなければ、名前を挙げて断る", () => {
    expect(() => requireOption(new Map(), "kind")).toThrow("--kind を渡してください");
  });
});
