import { describe, expect, it } from "vitest";

import { asArray, parseSpecs, tagName } from "./playwright-report";

describe("asArray", () => {
  // ----- 正常系 -----
  it("配列をそのまま返す", () => {
    expect(asArray<number>([1, 2])).toEqual([1, 2]);
  });

  // ----- 異常系 -----
  it("配列でない値を 0 件として読む", () => {
    expect(asArray(undefined)).toEqual([]);
    expect(asArray("a")).toEqual([]);
  });
});

describe("parseSpecs", () => {
  // ----- 正常系 -----
  it("入れ子になった suite の spec を平らに取り出す", () => {
    const json = JSON.stringify({
      suites: [
        { specs: [{ title: "外" }], suites: [{ specs: [{ title: "中" }] }] },
        { specs: [{ title: "隣" }] },
      ],
    });

    expect(parseSpecs(json).map((spec) => spec.title)).toEqual(["外", "中", "隣"]);
  });

  it("spec を持たない suite を 0 件として読む", () => {
    expect(parseSpecs(JSON.stringify({ suites: [{}] }))).toEqual([]);
  });

  // ----- 異常系 -----
  it("suites を持たないレポートを弾く", () => {
    expect(() => parseSpecs(JSON.stringify({}))).toThrow("suites がありません");
  });
});

describe("tagName", () => {
  // ----- 正常系 -----
  it("宣言の綴りからレポートに載る名前へ揃える", () => {
    expect(tagName("@baselines")).toBe("baselines");
  });

  it("`@` の無い名前はそのまま返す", () => {
    expect(tagName("baselines")).toBe("baselines");
  });
});
