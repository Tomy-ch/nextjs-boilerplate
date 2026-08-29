import { describe, expect, it } from "vitest";

import { indexableValidator, publicOriginValidator } from "./site.schema";

describe("publicOriginValidator", () => {
  // ----- 正常系 -----
  it("https の origin を通す", () => {
    expect(publicOriginValidator().parse("https://www.example.test")).toBe(
      "https://www.example.test",
    );
  });

  it("port 付きの http の origin を通す", () => {
    expect(publicOriginValidator().parse("http://localhost:3000")).toBe("http://localhost:3000");
  });

  // ----- 異常系 -----
  it("パス付きの URL を拒む", () => {
    expect(publicOriginValidator().safeParse("https://www.example.test/shop").success).toBe(false);
  });

  it("末尾に区切りが付いた URL を拒む", () => {
    expect(publicOriginValidator().safeParse("https://www.example.test/").success).toBe(false);
  });

  it("URL でない値を拒む", () => {
    expect(publicOriginValidator().safeParse("www.example.test").success).toBe(false);
  });

  it("空文字を拒む", () => {
    expect(publicOriginValidator().safeParse("").success).toBe(false);
  });
});

describe("indexableValidator", () => {
  // ----- 正常系 -----
  it("索引させる指定をそのまま通す", () => {
    expect(indexableValidator().parse("on")).toBe("on");
  });

  it("索引させない指定をそのまま通す", () => {
    expect(indexableValidator().parse("off")).toBe("off");
  });

  it("前後の空白を落としてから読む", () => {
    expect(indexableValidator().parse("  on  ")).toBe("on");
  });

  it("空文字は索引させない指定になる", () => {
    expect(indexableValidator().parse("")).toBe("off");
  });

  it("未設定は索引させない指定になる", () => {
    expect(indexableValidator().parse(undefined)).toBe("off");
  });

  // ----- 異常系 -----
  it("選べない値を拒む", () => {
    expect(indexableValidator().safeParse("true").success).toBe(false);
  });

  it("大文字の指定を拒む", () => {
    expect(indexableValidator().safeParse("ON").success).toBe(false);
  });
});
