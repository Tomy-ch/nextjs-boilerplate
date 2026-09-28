import { describe, expect, it } from "vitest";

import { MYPAGE_PATH, PROFILE_EDIT_PATH } from "./paths";

describe("MYPAGE_PATH", () => {
  // ----- 正常系 -----
  it("マイページの route segment を指す", () => {
    expect(MYPAGE_PATH).toBe("/mypage");
  });
});

describe("PROFILE_EDIT_PATH", () => {
  // ----- 正常系 -----
  it("プロフィール編集の route segment を指す", () => {
    expect(PROFILE_EDIT_PATH).toBe("/mypage/edit");
  });

  it("マイページの下の階層に置く", () => {
    expect(PROFILE_EDIT_PATH.startsWith(`${MYPAGE_PATH}/`)).toBe(true);
  });
});
