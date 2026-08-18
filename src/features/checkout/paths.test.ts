import { describe, expect, it } from "vitest";

import { PURCHASE_PARAM, purchaseCompletePath } from "./paths";

describe("purchaseCompletePath", () => {
  // ----- 正常系 -----
  it("完了画面へ、購入を検索条件として載せる", () => {
    expect(purchaseCompletePath("0195f0c2-0000-7000-9000-000000000001")).toBe(
      `/checkout/complete?${PURCHASE_PARAM}=0195f0c2-0000-7000-9000-000000000001`,
    );
  });

  // ----- 異常系 -----
  it("URL に置けない文字を含む値を、そのまま埋め込まない", () => {
    expect(purchaseCompletePath("a b&c=d")).toBe(
      `/checkout/complete?${PURCHASE_PARAM}=a%20b%26c%3Dd`,
    );
  });
});
