import { describe, expect, it } from "vitest";

import { cartSubtotal } from "./total";

describe("cartSubtotal", () => {
  // ----- 正常系 -----
  it("価格と数量を掛けて合算する", () => {
    expect(cartSubtotal([{ price: "12.34", quantity: 3 }])).toBe("37.02");
  });

  it("複数の行を合算する", () => {
    expect(
      cartSubtotal([
        { price: "12.34", quantity: 1 },
        { price: "0.66", quantity: 1 },
      ]),
    ).toBe("13.00");
  });

  it("小数を持たない価格でも 2 桁で返す", () => {
    expect(cartSubtotal([{ price: "80000", quantity: 1 }])).toBe("80000.00");
  });

  it("サブセントの価格を丸めずに合算する", () => {
    expect(cartSubtotal([{ price: "0.001", quantity: 3 }])).toBe("0.003");
  });

  it("桁数の異なる価格を最大の桁数に揃える", () => {
    expect(
      cartSubtotal([
        { price: "0.001", quantity: 1 },
        { price: "1.50", quantity: 2 },
      ]),
    ).toBe("3.001");
  });

  it("IEEE754 の丸めが出る組み合わせでも桁が狂わない", () => {
    expect(cartSubtotal([{ price: "0.10", quantity: 3 }])).toBe("0.30");
  });

  it("空のカートは 0 とする", () => {
    expect(cartSubtotal([])).toBe("0.00");
  });
});
