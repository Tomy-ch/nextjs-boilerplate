import { describe, expect, it } from "vitest";

import { errorMessage } from "./error-message";

describe("errorMessage", () => {
  // ----- 正常系 -----
  it("Error の文言を前後の空白を落として返す", () => {
    expect(errorMessage(new Error("  読めません  "))).toBe("読めません");
  });

  // ----- 異常系 -----
  it("文言が空の Error は文字列化した表現を返す", () => {
    expect(errorMessage(new Error(""))).toBe("Error");
  });

  it("Error でない値は文字列化して返す", () => {
    expect(errorMessage("失敗")).toBe("失敗");
    expect(errorMessage(42)).toBe("42");
    expect(errorMessage(null)).toBe("null");
  });
});
