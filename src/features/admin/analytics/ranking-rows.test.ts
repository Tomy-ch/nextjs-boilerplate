import { describe, expect, it } from "vitest";

import { type ProductRankingEntry, toProductId } from "@/model/product/product";

import { toRankingRows } from "./ranking-rows";

const FIRST = toProductId("0195f0c2-0000-7000-8000-000000000001");
const SECOND = toProductId("0195f0c2-0000-7000-8000-000000000002");

function entry(overrides: Partial<ProductRankingEntry> = {}): ProductRankingEntry {
  return {
    productId: FIRST,
    name: "ワイヤレスイヤホン",
    price: "129.99",
    soldQuantity: 42,
    ...overrides,
  };
}

describe("toRankingRows", () => {
  // ----- 正常系 -----
  it("契約が返した並びの位置をそのまま順位にする", () => {
    const rows = toRankingRows([
      entry({ productId: FIRST, name: "ワイヤレスイヤホン" }),
      entry({ productId: SECOND, name: "モバイルバッテリー" }),
    ]);

    expect(rows.map((row) => [row.rank, row.name])).toEqual([
      [1, "ワイヤレスイヤホン"],
      [2, "モバイルバッテリー"],
    ]);
  });

  it("販売数量が同じでも順位を付け直さない", () => {
    const rows = toRankingRows([
      entry({ productId: FIRST, soldQuantity: 10 }),
      entry({ productId: SECOND, soldQuantity: 10 }),
    ]);

    expect(rows.map((row) => row.rank)).toEqual([1, 2]);
  });

  it("単価は decimal 文字列のまま持ち出す", () => {
    expect(toRankingRows([entry({ price: "1299.50" })])[0]?.price).toBe("1299.50");
  });

  it("空の並びは空を返す", () => {
    expect(toRankingRows([])).toEqual([]);
  });
});
