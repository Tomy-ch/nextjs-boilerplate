import { describe, expect, it } from "vitest";

import { createAppError, findAppError, isAppError } from "./app-error";

describe("正常系", () => {
  it("分類と cause を持つアプリケーションエラーを生成する", () => {
    const cause = new Error("原因");
    const error = createAppError("conflict", { cause });

    expect(error.kind).toBe("conflict");
    expect(error.cause).toBe(cause);
    expect(findAppError(error)).toBe(error);
    expect(isAppError(error)).toBe(true);
  });

  it("外側で wrap された cause chain から分類を見つける", () => {
    const classified = createAppError("not-found");
    const wrapped = new Error("上位層の文脈", { cause: classified });

    expect(findAppError(wrapped)).toBe(classified);
    expect(isAppError(wrapped)).toBe(true);
  });
});

describe("異常系", () => {
  it("分類されていない値はアプリケーションエラーとして扱わない", () => {
    expect(findAppError(new Error("分類なし"))).toBeUndefined();
    expect(isAppError("分類なし")).toBe(false);
  });

  it("循環した cause chain の走査を停止する", () => {
    const error = new Error("循環");
    Object.defineProperty(error, "cause", { value: error });

    expect(findAppError(error)).toBeUndefined();
  });
});
