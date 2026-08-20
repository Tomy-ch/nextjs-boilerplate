import { describe, expect, it } from "vitest";

import { toProductId } from "@/model/product/product";

import { adminProductEditPath, adminProductStockPath, productDetailPath } from "./paths";

const ID = toProductId("0195f0c2-0000-7000-8000-000000000001");

describe("adminProductEditPath", () => {
  // ----- 正常系 -----
  it("商品の編集画面を指す", () => {
    expect(adminProductEditPath(ID)).toBe(`/admin/products/${ID}/edit`);
  });
});

describe("adminProductStockPath", () => {
  // ----- 正常系 -----
  it("商品の在庫補充画面を指す", () => {
    expect(adminProductStockPath(ID)).toBe(`/admin/products/${ID}/stock`);
  });
});

describe("productDetailPath", () => {
  // ----- 正常系 -----
  it("利用者向けの商品の面を指す", () => {
    expect(productDetailPath(ID)).toBe(`/products/${ID}`);
  });
});
