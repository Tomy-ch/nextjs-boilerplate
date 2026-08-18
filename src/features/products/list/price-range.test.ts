import { describe, expect, it } from "vitest";

import { FILTER_KEY } from "../facade/list-url/list-url";
import {
  applyPriceRange,
  formatPriceBound,
  PRICE_RANGE_MAX,
  PRICE_RANGE_MIN,
  toPriceRange,
} from "./price-range";

describe("toPriceRange", () => {
  // ----- 正常系 -----
  it("目盛りに載る下限と上限を位置へ写す", () => {
    expect(toPriceRange({ [FILTER_KEY.MIN_PRICE]: "25", [FILTER_KEY.MAX_PRICE]: "250" })).toEqual([
      2, 5,
    ]);
  });

  it("指定が無ければ両端を返す", () => {
    expect(toPriceRange({})).toEqual([PRICE_RANGE_MIN, PRICE_RANGE_MAX]);
  });

  it("空文字を指定なしとして読む", () => {
    expect(toPriceRange({ [FILTER_KEY.MIN_PRICE]: "", [FILTER_KEY.MAX_PRICE]: "" })).toEqual([
      PRICE_RANGE_MIN,
      PRICE_RANGE_MAX,
    ]);
  });

  it("片方だけ指定されていれば、もう片方は端のまま返す", () => {
    expect(toPriceRange({ [FILTER_KEY.MIN_PRICE]: "50" })).toEqual([3, PRICE_RANGE_MAX]);
  });

  // ----- 異常系 -----
  it("目盛りに無い値は指定なしの端として読む", () => {
    expect(toPriceRange({ [FILTER_KEY.MIN_PRICE]: "37" })).toEqual([
      PRICE_RANGE_MIN,
      PRICE_RANGE_MAX,
    ]);
  });

  it("同じキーが複数回現れたら指定なしとして読む", () => {
    expect(toPriceRange({ [FILTER_KEY.MIN_PRICE]: ["25", "50"] })).toEqual([
      PRICE_RANGE_MIN,
      PRICE_RANGE_MAX,
    ]);
  });
});

describe("applyPriceRange", () => {
  // ----- 正常系 -----
  it("位置を契約が受け取る十進文字列へ書き戻す", () => {
    expect(applyPriceRange({}, [2, 5])).toEqual({
      [FILTER_KEY.MIN_PRICE]: "25",
      [FILTER_KEY.MAX_PRICE]: "250",
    });
  });

  it("指定なしの端は空にする", () => {
    expect(applyPriceRange({}, [PRICE_RANGE_MIN, PRICE_RANGE_MAX])).toEqual({
      [FILTER_KEY.MIN_PRICE]: "",
      [FILTER_KEY.MAX_PRICE]: "",
    });
  });

  it("価格以外の条件はそのまま残す", () => {
    expect(applyPriceRange({ [FILTER_KEY.KEYWORD]: "鞄" }, [1, 4])).toMatchObject({
      [FILTER_KEY.KEYWORD]: "鞄",
    });
  });
});

describe("formatPriceBound", () => {
  // ----- 正常系 -----
  it("値のある位置を通貨付きで出す", () => {
    expect(formatPriceBound(1, "low")).toBe("$10");
  });

  it("下限の端を下限なしと呼ぶ", () => {
    expect(formatPriceBound(PRICE_RANGE_MIN, "low")).toBe("下限なし");
  });

  it("上限の端を上限なしと呼ぶ", () => {
    expect(formatPriceBound(PRICE_RANGE_MAX, "high")).toBe("上限なし");
  });

  // ----- 異常系 -----
  it("目盛りの外の位置は、その端の指定なしとして呼ぶ", () => {
    expect(formatPriceBound(PRICE_RANGE_MAX + 1, "high")).toBe("上限なし");
  });
});
