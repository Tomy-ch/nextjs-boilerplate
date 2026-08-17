import { describe, expect, it } from "vitest";

import { FILTER_KEY } from "../facade/list-url/list-url";
import {
  applyStockAvailability,
  formatStockAvailability,
  STOCK_AVAILABILITY,
  toStockAvailability,
} from "./stock-availability";

describe("toStockAvailability", () => {
  // ----- 正常系 -----
  it("在庫数の下限が 1 だけ立っていれば在庫ありと読む", () => {
    expect(toStockAvailability({ [FILTER_KEY.MIN_QUANTITY]: "1" })).toBe(
      STOCK_AVAILABILITY.IN_STOCK,
    );
  });

  it("在庫数の上限が 0 だけ立っていれば在庫なしと読む", () => {
    expect(toStockAvailability({ [FILTER_KEY.MAX_QUANTITY]: "0" })).toBe(
      STOCK_AVAILABILITY.OUT_OF_STOCK,
    );
  });

  it("在庫数の条件が無ければすべてと読む", () => {
    expect(toStockAvailability({})).toBe(STOCK_AVAILABILITY.ALL);
  });

  it("空文字はその条件が無いものとして読む", () => {
    expect(
      toStockAvailability({ [FILTER_KEY.MIN_QUANTITY]: "1", [FILTER_KEY.MAX_QUANTITY]: "" }),
    ).toBe(STOCK_AVAILABILITY.IN_STOCK);
  });

  // ----- 異常系 -----
  it("3 つの選択肢のどれにも当たらない範囲はすべてと読む", () => {
    expect(
      toStockAvailability({ [FILTER_KEY.MIN_QUANTITY]: "5", [FILTER_KEY.MAX_QUANTITY]: "10" }),
    ).toBe(STOCK_AVAILABILITY.ALL);
  });

  it("下限と上限が同時に立っていればすべてと読む", () => {
    expect(
      toStockAvailability({ [FILTER_KEY.MIN_QUANTITY]: "1", [FILTER_KEY.MAX_QUANTITY]: "0" }),
    ).toBe(STOCK_AVAILABILITY.ALL);
  });

  it("同じキーが複数回現れたらすべてと読む", () => {
    expect(toStockAvailability({ [FILTER_KEY.MIN_QUANTITY]: ["1", "1"] })).toBe(
      STOCK_AVAILABILITY.ALL,
    );
  });
});

describe("applyStockAvailability", () => {
  // ----- 正常系 -----
  it("在庫ありを在庫数の下限へ写す", () => {
    expect(applyStockAvailability({}, STOCK_AVAILABILITY.IN_STOCK)).toEqual({
      [FILTER_KEY.MIN_QUANTITY]: "1",
      [FILTER_KEY.MAX_QUANTITY]: "",
    });
  });

  it("在庫なしを在庫数の上限へ写す", () => {
    expect(applyStockAvailability({}, STOCK_AVAILABILITY.OUT_OF_STOCK)).toEqual({
      [FILTER_KEY.MIN_QUANTITY]: "",
      [FILTER_KEY.MAX_QUANTITY]: "0",
    });
  });

  it("すべてを選ぶと両端を外す", () => {
    expect(
      applyStockAvailability({ [FILTER_KEY.MIN_QUANTITY]: "1" }, STOCK_AVAILABILITY.ALL),
    ).toEqual({ [FILTER_KEY.MIN_QUANTITY]: "", [FILTER_KEY.MAX_QUANTITY]: "" });
  });

  it("在庫以外の条件はそのまま残す", () => {
    expect(
      applyStockAvailability({ [FILTER_KEY.KEYWORD]: "鞄" }, STOCK_AVAILABILITY.IN_STOCK),
    ).toMatchObject({ [FILTER_KEY.KEYWORD]: "鞄" });
  });
});

describe("formatStockAvailability", () => {
  // ----- 正常系 -----
  it("在庫を条件にしない状態を「すべて」と呼ぶ", () => {
    expect(formatStockAvailability(STOCK_AVAILABILITY.ALL)).toBe("すべて");
  });

  it("1 つ以上ある状態を「在庫あり」と呼ぶ", () => {
    expect(formatStockAvailability(STOCK_AVAILABILITY.IN_STOCK)).toBe("在庫あり");
  });

  it("1 つも無い状態を「在庫なし」と呼ぶ", () => {
    expect(formatStockAvailability(STOCK_AVAILABILITY.OUT_OF_STOCK)).toBe("在庫なし");
  });
});
