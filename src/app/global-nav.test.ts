import { describe, expect, it } from "vitest";

import { GLOBAL_NAV_ITEMS } from "./global-nav";

describe("GLOBAL_NAV_ITEMS", () => {
  // ----- 正常系 -----
  it("商品・購入履歴・マイページを、この順で指す", () => {
    expect(GLOBAL_NAV_ITEMS).toEqual([
      { href: "/products", label: "商品" },
      { href: "/purchases", label: "購入履歴" },
      { href: "/mypage", label: "マイページ" },
    ]);
  });
});
