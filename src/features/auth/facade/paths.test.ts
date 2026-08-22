import { describe, expect, it } from "vitest";

import { LOGIN_PATH, loginPath } from "./paths";

describe("LOGIN_PATH", () => {
  // ----- 正常系 -----
  it("ログイン画面の route segment を指す", () => {
    expect(LOGIN_PATH).toBe("/login");
  });
});

describe("loginPath", () => {
  // ----- 正常系 -----
  it("戻り先を載せた行き先を組む", () => {
    expect(loginPath("/mypage")).toBe("/login?returnUrl=%2Fmypage");
  });

  it("検索条件を持つ戻り先も、丸ごと 1 つの値として載せる", () => {
    expect(loginPath("/purchases?period=month")).toBe(
      "/login?returnUrl=%2Fpurchases%3Fperiod%3Dmonth",
    );
  });

  // ----- 異常系 -----
  it("外部の URL を渡されても自サイトの既定へ倒す", () => {
    expect(loginPath("https://evil.test/steal")).toBe("/login?returnUrl=%2F");
  });

  it("解析すると外部を指す形も既定へ倒す", () => {
    expect(loginPath("/\t/evil.test")).toBe("/login?returnUrl=%2F");
  });
});
