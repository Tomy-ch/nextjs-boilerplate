import { describe, expect, it } from "vitest";
import { z } from "zod";

import { repeatedValues, singleValue } from "./search-params";

const single = singleValue(z.string()).catch("既定");
const repeated = repeatedValues(z.array(z.string()));

describe("singleValue", () => {
  // ----- 正常系 -----
  it("1 度だけ現れた値をそのまま読む", () => {
    expect(single.parse("イヤホン")).toBe("イヤホン");
  });

  it("前後の空白を落として読む", () => {
    expect(single.parse("  イヤホン  ")).toBe("イヤホン");
  });

  it("渡したスキーマが値を照らす", () => {
    expect(singleValue(z.coerce.number()).parse("3")).toBe(3);
  });

  it("キーが無ければ未指定として扱う", () => {
    expect(single.parse(undefined)).toBe("既定");
  });

  it("空白だけの値は未指定として扱う", () => {
    expect(single.parse("   ")).toBe("既定");
  });

  // ----- 異常系 -----
  it("繰り返された値は、先頭を採らず未指定として扱う", () => {
    expect(single.parse(["イヤホン", "スピーカー"])).toBe("既定");
  });
});

describe("repeatedValues", () => {
  // ----- 正常系 -----
  it("繰り返された値を並びとして読む", () => {
    expect(repeated.parse(["1", "2"])).toEqual(["1", "2"]);
  });

  it("1 度しか現れない値も 1 件の並びとして読む", () => {
    expect(repeated.parse("1")).toEqual(["1"]);
  });

  it("前後の空白を落として読む", () => {
    expect(repeated.parse([" 1 ", " 2 "])).toEqual(["1", "2"]);
  });

  it("渡したスキーマが並びを照らす", () => {
    expect(repeatedValues(z.array(z.coerce.number())).parse(["1", "2"])).toEqual([1, 2]);
  });

  it("キーが無ければ空の並びとして読む", () => {
    expect(repeated.parse(undefined)).toEqual([]);
  });

  it("空の値は並びから落とす", () => {
    expect(repeated.parse(["1", "  ", "2"])).toEqual(["1", "2"]);
  });

  // ----- 異常系 -----
  it("文字列でない値は並びから落とす", () => {
    expect(repeated.parse([1, "2"])).toEqual(["2"]);
  });
});
