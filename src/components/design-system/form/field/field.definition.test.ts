import { describe, expect, it } from "vitest";

import { toDescriptionId, toErrorId } from "./field.definition";

const CONTROL_ID = "profile-email";

describe("toErrorId", () => {
  // ----- 正常系 -----
  it("入力欄の id から、誤りの文言の id を導く", () => {
    expect(toErrorId(CONTROL_ID)).toBe("profile-email-error");
  });
});

describe("toDescriptionId", () => {
  // ----- 正常系 -----
  it("入力欄の id から、補足の id を導く", () => {
    expect(toDescriptionId(CONTROL_ID)).toBe("profile-email-description");
  });
});
