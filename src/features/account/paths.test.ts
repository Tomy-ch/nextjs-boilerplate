import { describe, expect, it } from "vitest";

import { MYPAGE_PATH } from "./facade/paths/paths";
import { ONBOARDING_PATH, onboardingPath } from "./paths";

describe("ONBOARDING_PATH", () => {
  // ----- 正常系 -----
  it("登録画面の route segment を指す", () => {
    expect(ONBOARDING_PATH).toBe("/onboarding");
  });

  it("マイページの下ではなく、認証の側に置く", () => {
    expect(ONBOARDING_PATH.startsWith(`${MYPAGE_PATH}/`)).toBe(false);
  });
});

describe("onboardingPath", () => {
  // ----- 正常系 -----
  it("戻り先を載せた行き先を組む", () => {
    expect(onboardingPath("/checkout")).toBe("/onboarding?returnUrl=%2Fcheckout");
  });

  // ----- 異常系 -----
  it("外部の URL を渡されても自サイトの既定へ倒す", () => {
    expect(onboardingPath("https://evil.test/steal")).toBe("/onboarding?returnUrl=%2F");
  });
});
