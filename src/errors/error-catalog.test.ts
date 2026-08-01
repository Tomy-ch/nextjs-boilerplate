import { describe, expect, it } from "vitest";

import { createAppError } from "./app-error";
import { getDefaultErrorMeta, resolveErrorMeta } from "./error-catalog";
import { createErrorMeta, withErrorMeta } from "./error-meta";

describe("正常系", () => {
  it("全分類に暫定コードと日本語の既定文言を定義する", () => {
    expect(getDefaultErrorMeta("invalid-argument").code).toBe("BAD_REQUEST");
    expect(getDefaultErrorMeta("unauthenticated").code).toBe("UNAUTHENTICATED");
    expect(getDefaultErrorMeta("permission-denied").code).toBe("FORBIDDEN");
    expect(getDefaultErrorMeta("not-found").code).toBe("NOT_FOUND");
    expect(getDefaultErrorMeta("conflict").code).toBe("RESOURCE_CONFLICT");
    expect(getDefaultErrorMeta("validation").code).toBe("VALIDATION_FAILED");
    expect(getDefaultErrorMeta("too-many-requests").code).toBe("TOO_MANY_REQUESTS");
    expect(getDefaultErrorMeta("unavailable").code).toBe("SERVICE_UNAVAILABLE");
    expect(getDefaultErrorMeta("unimplemented").code).toBe("NOT_IMPLEMENTED");
    expect(getDefaultErrorMeta("internal").code).toBe("INTERNAL");
    expect(getDefaultErrorMeta("internal").message).toBe(
      "問題が発生しました。時間をおいて再試行してください。",
    );
  });

  it("分類から既定メタ情報を解決する", () => {
    const error = createAppError("validation");

    expect(resolveErrorMeta(error)).toMatchObject({
      code: "VALIDATION_FAILED",
      message: "入力内容を確認してください。",
      details: [],
    });
  });

  it("外側のメタ情報で code・文言・詳細を上書きする", () => {
    const error = withErrorMeta(
      createAppError("validation"),
      createErrorMeta({
        code: "INVALID_EMAIL",
        message: "メールアドレスを確認してください。",
        requestId: "req-123",
        details: ["email"],
      }),
    );

    expect(resolveErrorMeta(error)).toMatchObject({
      code: "INVALID_EMAIL",
      message: "メールアドレスを確認してください。",
      requestId: "req-123",
      details: ["email"],
    });
  });

  it("空の上書き値には分類カタログの既定値を使う", () => {
    const error = withErrorMeta(
      createAppError("not-found"),
      createErrorMeta({ details: ["userId"] }),
    );

    expect(resolveErrorMeta(error)).toMatchObject({
      code: "NOT_FOUND",
      message: "対象が見つかりません。",
      requestId: "",
      details: ["userId"],
    });
  });
});

describe("異常系", () => {
  it("分類のないエラーからはメタ情報を解決しない", () => {
    expect(resolveErrorMeta(new Error("分類なし"))).toBeUndefined();
  });
});
