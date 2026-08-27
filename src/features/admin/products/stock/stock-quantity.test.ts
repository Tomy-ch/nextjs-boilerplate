import { describe, expect, it } from "vitest";

import { toStockQuantity } from "./stock-quantity";

describe("toStockQuantity", () => {
  // ----- 正常系 -----
  it("整数として読める値をそのまま返す", () => {
    expect(toStockQuantity("50")).toBe(50);
  });

  it("下限の 1 を受け付ける", () => {
    expect(toStockQuantity("1")).toBe(1);
  });

  // ----- 異常系 -----
  it("打ちかけの空欄は、誤りではなく「まだ読めない」として返す", () => {
    expect(toStockQuantity("")).toBeNull();
  });

  it("下限を下回る 0 を退ける", () => {
    expect(toStockQuantity("0")).toBeNull();
  });

  it("符号は向きが持つため、負の値を退ける", () => {
    expect(toStockQuantity("-1")).toBeNull();
  });

  it("在庫は個数なので、小数を退ける", () => {
    expect(toStockQuantity("1.5")).toBeNull();
  });

  it("数として読めない文字列を退ける", () => {
    expect(toStockQuantity("いくつか")).toBeNull();
  });

  it("整数として扱えない大きさの値を退ける", () => {
    expect(toStockQuantity(String(Number.MAX_SAFE_INTEGER + 2))).toBeNull();
  });
});
