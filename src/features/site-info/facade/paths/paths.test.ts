import { describe, expect, it } from "vitest";

import { ABOUT_PATH, PRIVACY_PATH, TERMS_PATH } from "./paths";

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
