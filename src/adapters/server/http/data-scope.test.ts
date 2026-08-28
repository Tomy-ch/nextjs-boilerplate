import { describe, expect, it } from "vitest";
import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { assertNoCredentialHeader, assertSpecWithinScope } from "./data-scope";

function kindOf(run: () => void): string | undefined {
  try {
    run();
  } catch (error) {
    return findAppError(error)?.kind;
  }

  return undefined;
}

describe("assertSpecWithinScope", () => {
  // ----- 正常系 -----
  it("主体を名乗らない口のキャッシュ指定を通す", () => {
    expect(() =>
      assertSpecWithinScope("public", {
        path: "/v1/prefectures",
        cache: "force-cache",
        tags: ["prefecture-masters"],
      }),
    ).not.toThrow();
  });

  it("キャッシュを指定しない、主体に紐づく取得を通す", () => {
    expect(() => assertSpecWithinScope("user-scoped", { path: "/v1/users/me" })).not.toThrow();
  });

  // ----- 異常系 -----
  it("主体に紐づく取得のキャッシュ指定を invalid-argument で落とす", () => {
    expect(
      kindOf(() =>
        assertSpecWithinScope("user-scoped", { path: "/v1/users/me", cache: "force-cache" }),
      ),
    ).toBe(ErrorKind.INVALID_ARGUMENT);
  });

  it("主体に紐づく取得の再検証タグを invalid-argument で落とす", () => {
    expect(
      kindOf(() => assertSpecWithinScope("user-scoped", { path: "/v1/users/me", tags: ["users"] })),
    ).toBe(ErrorKind.INVALID_ARGUMENT);
  });
});

describe("assertNoCredentialHeader", () => {
  // ----- 正常系 -----
  it("呼び出しごとのヘッダを持たない指定を通す", () => {
    expect(() => assertNoCredentialHeader()).not.toThrow();
  });

  it("契約が要求するヘッダを通す", () => {
    expect(() =>
      assertNoCredentialHeader({ "Idempotency-Key": "key", "X-Request-Scope": "scope" }),
    ).not.toThrow();
  });

  // ----- 異常系 -----
  it("Authorization を invalid-argument で落とす", () => {
    expect(kindOf(() => assertNoCredentialHeader({ Authorization: "Bearer token" }))).toBe(
      ErrorKind.INVALID_ARGUMENT,
    );
  });

  it("綴りの大文字小文字を問わずに落とす", () => {
    expect(kindOf(() => assertNoCredentialHeader({ Cookie: "session=x" }))).toBe(
      ErrorKind.INVALID_ARGUMENT,
    );
  });
});
