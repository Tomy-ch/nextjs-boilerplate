import { describe, expect, it } from "vitest";

import { AUTHORIZE_ERROR } from "./authorize-error";
import { readAuthorizeError } from "./read-authorize-error";

describe("readAuthorizeError", () => {
  // ----- 正常系 -----
  it("宣言した理由を読む", () => {
    expect(readAuthorizeError({ error: "unavailable" })).toBe(AUTHORIZE_ERROR.UNAVAILABLE);
  });

  it("載っていなければ案内しない", () => {
    expect(readAuthorizeError({})).toBeNull();
  });

  // ----- 異常系 -----
  it("宣言に無い値は案内しない", () => {
    expect(readAuthorizeError({ error: "任意の文言" })).toBeNull();
  });

  it("繰り返された指定は案内しない", () => {
    expect(readAuthorizeError({ error: ["invalid", "unavailable"] })).toBeNull();
  });
});
