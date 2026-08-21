import { describe, expect, it } from "vitest";

import { isStockDirection, STOCK_DIRECTION, toStockDelta } from "./stock-direction";

describe("isStockDirection", () => {
  // ----- 正常系 -----
  it("補充を向きとして認める", () => {
    expect(isStockDirection(STOCK_DIRECTION.REPLENISH)).toBe(true);
  });

  it("差し引きを向きとして認める", () => {
    expect(isStockDirection(STOCK_DIRECTION.DEDUCT)).toBe(true);
  });

  // ----- 異常系 -----
  it("宣言に無い文字列を退ける", () => {
    expect(isStockDirection("increase")).toBe(false);
  });

  it("値が届かなかった場合を退ける", () => {
    expect(isStockDirection(null)).toBe(false);
  });
});

describe("toStockDelta", () => {
  // ----- 正常系 -----
  it("補充は量をそのまま正の増減量にする", () => {
    expect(toStockDelta(STOCK_DIRECTION.REPLENISH, 50)).toBe(50);
  });

  it("差し引きは量の符号を反転させる", () => {
    expect(toStockDelta(STOCK_DIRECTION.DEDUCT, 50)).toBe(-50);
  });
});
