import { describe, expect, it } from "vitest";

import { toRawQuery } from "./search-params";

describe("toRawQuery", () => {
  // ----- 正常系 -----
  it("1 度だけ現れたキーを文字列として読む", () => {
    expect(toRawQuery(new URLSearchParams("keyword=%E9%9E%84"))).toEqual({ keyword: "鞄" });
  });

  it("繰り返されたキーを並びのまま残す", () => {
    expect(toRawQuery(new URLSearchParams("categoryId=a&categoryId=b"))).toEqual({
      categoryId: ["a", "b"],
    });
  });

  it("繰り返しと単一が混ざっていてもそれぞれの形で読む", () => {
    expect(toRawQuery(new URLSearchParams("categoryId=a&categoryId=b&keyword=x"))).toEqual({
      categoryId: ["a", "b"],
      keyword: "x",
    });
  });

  it("値が空でもキーとして残す", () => {
    expect(toRawQuery(new URLSearchParams("keyword="))).toEqual({ keyword: "" });
  });

  it("条件が無ければ空で返す", () => {
    expect(toRawQuery(new URLSearchParams())).toEqual({});
  });
});
