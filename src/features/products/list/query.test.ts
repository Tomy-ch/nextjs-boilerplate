import { describe, expect, it } from "vitest";
import { toProductQuery } from "./query";

describe("toProductQuery", () => {
  // ----- 正常系 -----
  it("検索条件を取得条件へ写す", () => {
    expect(
      toProductQuery({ keyword: "イヤホン", categoryId: "c1", after: "cursor", sort: "-price" }),
    ).toEqual({ keyword: "イヤホン", categoryId: "c1", after: "cursor", sort: "-price" });
  });

  it("件数を数値へ直す", () => {
    expect(toProductQuery({ first: "20" })).toEqual({ first: 20 });
  });

  it("条件が無ければ空にする", () => {
    expect(toProductQuery({})).toEqual({});
  });

  it("同じキーが複数あれば先頭を採る", () => {
    expect(toProductQuery({ keyword: ["靴", "鞄"] })).toEqual({ keyword: "靴" });
  });
  it("値の無い配列を無指定として扱う", () => {
    expect(toProductQuery({ keyword: [] })).toEqual({});
  });

  // ----- 異常系 -----
  it("契約にない並び順を捨てる", () => {
    expect(toProductQuery({ sort: "-unknown" })).toEqual({});
  });

  it("上限を超える件数を捨てる", () => {
    expect(toProductQuery({ first: "201" })).toEqual({});
  });

  it("0 以下の件数を捨てる", () => {
    expect(toProductQuery({ first: "0" })).toEqual({});
  });

  it("数値でない件数を捨てる", () => {
    expect(toProductQuery({ first: "たくさん" })).toEqual({});
  });

  it("小数の件数を捨てる", () => {
    expect(toProductQuery({ first: "1.5" })).toEqual({});
  });

  it("空文字列の条件を無指定として扱う", () => {
    expect(toProductQuery({ keyword: "", categoryId: "" })).toEqual({});
  });
});
