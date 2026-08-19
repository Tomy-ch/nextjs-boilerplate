import { describe, expect, it } from "vitest";

import { purchaseDetailPath } from "./paths";

describe("purchaseDetailPath", () => {
  // ----- 正常系 -----
  it("購入履歴の下の階層を指す", () => {
    expect(purchaseDetailPath("0195f0c2-0000-7000-9000-000000000001")).toBe(
      "/purchases/0195f0c2-0000-7000-9000-000000000001",
    );
  });

  // ----- 異常系 -----
  it("パスの区切りに使われる文字を含む識別子でも、階層を増やさない", () => {
    expect(purchaseDetailPath("a/b")).toBe("/purchases/a%2Fb");
  });
});
