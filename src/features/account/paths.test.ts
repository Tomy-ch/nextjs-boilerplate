import { describe, expect, it } from "vitest";

import { MYPAGE_PATH, PROFILE_EDIT_PATH } from "./paths";

/*
 * 参照側のテストは定数どうしを突き合わせるので、値そのものは誰も固定していない。ここが唯一の
 * 直値との突き合わせであり、`app/` の route segment と定数がずれたことに気づける地点である。
 */

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
