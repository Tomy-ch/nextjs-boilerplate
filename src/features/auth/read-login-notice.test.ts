import { describe, expect, it } from "vitest";

import { LOGIN_NOTICE, unavailableLoginPath } from "./facade/paths";
import { readLoginNotice } from "./read-login-notice";

describe("readLoginNotice", () => {
  // ----- 正常系 -----
  it("宣言された理由を読む", () => {
    expect(readLoginNotice({ error: "unavailable" })).toBe(LOGIN_NOTICE.UNAVAILABLE);
  });

  it("組む側が付けた理由を、そのまま読み取れる", () => {
    const query = new URL(unavailableLoginPath("/mypage"), "http://localhost").searchParams;

    expect(readLoginNotice(Object.fromEntries(query))).toBe(LOGIN_NOTICE.UNAVAILABLE);
  });

  it("前後の空白を落として読む", () => {
    expect(readLoginNotice({ error: " unavailable " })).toBe(LOGIN_NOTICE.UNAVAILABLE);
  });

  // ----- 異常系 -----
  it("理由が載っていなければ案内しない", () => {
    expect(readLoginNotice({ returnUrl: "/mypage" })).toBeNull();
  });

  it("宣言に無い理由は案内しない", () => {
    expect(readLoginNotice({ error: "unauthorized" })).toBeNull();
  });

  it("空の値は案内しない", () => {
    expect(readLoginNotice({ error: "" })).toBeNull();
  });

  it("同じ理由が繰り返されていても案内しない", () => {
    expect(readLoginNotice({ error: ["unavailable", "unavailable"] })).toBeNull();
  });
});
