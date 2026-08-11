import { describe, expect, it } from "vitest";

import { AppError, createAppError, findAppError, isAppError } from "./app-error";

describe("AppError", () => {
  // ----- 正常系 -----
  it("分類を kind に保持し、name を AppError にする", () => {
    const error = new AppError("conflict");

    expect(error.kind).toBe("conflict");
    expect(error.name).toBe("AppError");
    expect(error).toBeInstanceOf(Error);
  });

  it("原因エラーを cause として保つ", () => {
    const cause = new Error("原因");

    expect(new AppError("conflict", { cause }).cause).toBe(cause);
  });
});

describe("createAppError", () => {
  // ----- 正常系 -----
  it("分類と cause を持つアプリケーションエラーを生成する", () => {
    const cause = new Error("原因");
    const error = createAppError("conflict", { cause });

    expect(error).toBeInstanceOf(AppError);
    expect(error.kind).toBe("conflict");
    expect(error.cause).toBe(cause);
  });

  it("options を渡さなくても分類だけで生成できる", () => {
    expect(createAppError("not-found").cause).toBeUndefined();
  });
});

describe("findAppError", () => {
  // ----- 正常系 -----
  it("自身がアプリケーションエラーならそれを返す", () => {
    const error = createAppError("conflict");

    expect(findAppError(error)).toBe(error);
  });

  it("外側で wrap された cause chain から分類を見つける", () => {
    const classified = createAppError("not-found");
    const wrapped = new Error("上位層の文脈", { cause: classified });

    expect(findAppError(wrapped)).toBe(classified);
  });

  // ----- 異常系 -----
  it("分類が含まれない cause chain では undefined を返す", () => {
    expect(findAppError(new Error("分類なし"))).toBeUndefined();
  });

  it("Error でない値には undefined を返す", () => {
    expect(findAppError("分類なし")).toBeUndefined();
  });

  it("循環した cause chain の走査を停止する", () => {
    const error = new Error("循環");
    Object.defineProperty(error, "cause", { value: error });

    expect(findAppError(error)).toBeUndefined();
  });
});

describe("isAppError", () => {
  // ----- 正常系 -----
  it("cause chain に分類があれば true を返す", () => {
    const wrapped = new Error("上位層の文脈", { cause: createAppError("not-found") });

    expect(isAppError(createAppError("conflict"))).toBe(true);
    expect(isAppError(wrapped)).toBe(true);
  });

  // ----- 異常系 -----
  it("分類されていない値には false を返す", () => {
    expect(isAppError(new Error("分類なし"))).toBe(false);
    expect(isAppError("分類なし")).toBe(false);
  });
});
