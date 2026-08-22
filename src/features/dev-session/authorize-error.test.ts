import { describe, expect, it } from "vitest";

import { AUTHORIZE_ERROR, authorizeFailurePath } from "./authorize-error";

describe("authorizeFailurePath", () => {
  // ----- 正常系 -----
  it("理由を載せて発行の画面へ戻す", () => {
    const path = new URL(
      authorizeFailurePath("/mypage", "tx-state", AUTHORIZE_ERROR.INVALID),
      "http://localhost:3000",
    );

    expect(path.pathname).toBe("/dev/session");
    expect(path.searchParams.get("error")).toBe("invalid");
  });

  it("戻り先と対応づける値を持ち回る", () => {
    const path = new URL(
      authorizeFailurePath("/checkout", "tx-state", AUTHORIZE_ERROR.UNAVAILABLE),
      "http://localhost:3000",
    );

    expect(path.searchParams.get("returnUrl")).toBe("/checkout");
    expect(path.searchParams.get("state")).toBe("tx-state");
  });
});
