import { describe, expect, it } from "vitest";

import { ABOUT_PATH, PRIVACY_PATH, TERMS_PATH } from "./paths";

/*
 * 参照側のテストは定数どうしを突き合わせるので、値そのものは誰も固定していない。ここが唯一の
 * 直値との突き合わせであり、`app/` の route segment と定数がずれたことに気づける地点である。
 */

describe("ABOUT_PATH", () => {
  // ----- 正常系 -----
  it("このサイトについての route segment を指す", () => {
    expect(ABOUT_PATH).toBe("/about");
  });
});

describe("PRIVACY_PATH", () => {
  // ----- 正常系 -----
  it("プライバシーポリシーの route segment を指す", () => {
    expect(PRIVACY_PATH).toBe("/privacy");
  });
});

describe("TERMS_PATH", () => {
  // ----- 正常系 -----
  it("利用規約の route segment を指す", () => {
    expect(TERMS_PATH).toBe("/terms");
  });
});
