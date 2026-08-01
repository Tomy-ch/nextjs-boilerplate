import { describe, expect, it } from "vitest";

import { createErrorMeta, errorMetaFrom, withErrorDetails, withErrorMeta } from "./error-meta";

describe("正常系", () => {
  it("入力配列と取得配列をコピーして不変に保つ", () => {
    const details = ["email"];
    const meta = createErrorMeta({ code: "INVALID_EMAIL", requestId: "req-123", details });
    details.push("password");
    const extractedDetails = [...meta.details];
    extractedDetails.push("name");

    expect(meta.code).toBe("INVALID_EMAIL");
    expect(meta.requestId).toBe("req-123");
    expect(meta.details).toEqual(["email"]);
  });

  it("文言だけを上書きした新しいメタ情報を返す", () => {
    const meta = createErrorMeta({
      code: "INVALID_EMAIL",
      message: "既定文言",
      requestId: "req-123",
    });
    const overridden = meta.withMessage("入力内容を確認してください。");

    expect(meta.message).toBe("既定文言");
    expect(overridden.code).toBe("INVALID_EMAIL");
    expect(overridden.message).toBe("入力内容を確認してください。");
    expect(overridden.requestId).toBe("req-123");
  });

  it("メタ情報ラッパーが元の cause chain を保持する", () => {
    const cause = new Error("元エラー");
    const meta = createErrorMeta({ code: "INVALID_EMAIL" });
    const wrapped = withErrorMeta(cause, meta);

    expect(wrapped.cause).toBe(cause);
    expect(errorMetaFrom(wrapped)).toBe(meta);
  });

  it("最も外側のメタ情報と詳細識別子を優先する", () => {
    const inner = withErrorMeta(new Error("元エラー"), createErrorMeta({ code: "INNER" }));
    const outer = withErrorDetails(inner, ["email"]);

    expect(errorMetaFrom(outer)?.details).toEqual(["email"]);
  });
});

describe("異常系", () => {
  it("undefined のエラーにはメタ情報を付与しない", () => {
    const meta = createErrorMeta({ code: "IGNORED" });

    expect(withErrorMeta(undefined, meta)).toBeUndefined();
    expect(withErrorDetails(undefined, ["email"])).toBeUndefined();
  });

  it("メタ情報を持たない値と循環した cause chain は解決しない", () => {
    const error = new Error("循環");
    Object.defineProperty(error, "cause", { value: error });

    expect(errorMetaFrom("エラーではない")).toBeUndefined();
    expect(errorMetaFrom(error)).toBeUndefined();
  });
});
