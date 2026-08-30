import { describe, expect, it } from "vitest";

import { errorMessage } from "./error-message";

describe("errorMessage", () => {
  // ----- 正常系 -----
  it("Error の文言を前後の空白を落として返す", () => {
    expect(errorMessage(new Error("  読めません  "))).toBe("読めません");
  });

  it("改行を空白へ均し、1 行に保つ", () => {
    expect(errorMessage(new Error("読めません\n偽の 1 行"))).toBe("読めません 偽の 1 行");
  });

  it("表示されない制御文字も空白へ均す", () => {
    expect(errorMessage("読め\u0007ません")).toBe("読め ません");
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
