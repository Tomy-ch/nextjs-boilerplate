import { describe, expect, it } from "vitest";

import { toProductDetailHref } from "./detail-url";

describe("toProductDetailHref", () => {
  // ----- 正常系 -----
  it("一覧の経路の下に ID を置く", () => {
    expect(toProductDetailHref("0195f0c2-0000-7000-8000-000000000001")).toBe(
      "/products/0195f0c2-0000-7000-8000-000000000001",
    );
  });

  it("経路に置けない文字を符号化する", () => {
    expect(toProductDetailHref("a/b?c")).toBe("/products/a%2Fb%3Fc");
  });
});
