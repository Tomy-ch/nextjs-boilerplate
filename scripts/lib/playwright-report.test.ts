import { describe, expect, it } from "vitest";

import { asArray, isFailed, parseSpecs, tagName } from "./playwright-report";

describe("asArray", () => {
  // ----- 正常系 -----
  it("配列をそのまま返す", () => {
    expect(asArray<number>([1, 2])).toEqual([1, 2]);
  });

  it("配列でない値を 0 件として読む", () => {
    expect(asArray(undefined)).toEqual([]);
    expect(asArray("a")).toEqual([]);
  });
});

describe("isFailed", () => {
  // ----- 正常系 -----
  it("失敗した test を落ちたと答える", () => {
    expect(isFailed({ status: "unexpected" })).toBe(true);
  });

  it("再試行で通った test も落ちたと答える", () => {
    expect(isFailed({ status: "flaky" })).toBe(true);
  });

  it("通った test は落ちていない", () => {
    expect(isFailed({ status: "expected" })).toBe(false);
  });

  it("走らせなかった test は落ちていない", () => {
    expect(isFailed({ status: "skipped" })).toBe(false);
  });

  // ----- 異常系 -----
  it("status が無い test は落ちていない", () => {
    expect(isFailed({})).toBe(false);
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

  it("suites が配列でないレポートを弾く", () => {
    expect(() => parseSpecs(JSON.stringify({ suites: "a" }))).toThrow("suites がありません");
  });

  it("JSON として読めない入力は解析の失敗をそのまま投げる", () => {
    expect(() => parseSpecs("途中で切れたレポート")).toThrow(SyntaxError);
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

  // ----- 異常系 -----
  it("文字列でない tag は、どの tag にも当たらない値へ倒す", () => {
    expect(tagName(123)).toBe("");
    expect(tagName(null)).toBe("");
  });
});
