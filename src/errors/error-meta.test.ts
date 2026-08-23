import { describe, expect, it } from "vitest";

import {
  createErrorMeta,
  ErrorMeta,
  errorMetaFrom,
  withErrorDetails,
  withErrorMeta,
} from "./error-meta";

describe("ErrorMeta", () => {
  // ----- 正常系 -----
  it("省略した項目を空値で補う", () => {
    const meta = ErrorMeta.create();

    expect(meta.code).toBe("");
    expect(meta.message).toBe("");
    expect(meta.requestId).toBe("");
    expect(meta.details).toEqual([]);
  });

  it("生成時に渡した配列への後からの追加を映さない", () => {
    const details = ["email"];
    const meta = ErrorMeta.create({ details });
    details.push("password");

    expect(meta.details).toEqual(["email"]);
  });

  it("取得のたびに複製を返し、呼び出し側の書き換えを自身へ届かせない", () => {
    const meta = ErrorMeta.create({ details: ["email"] });
    const taken = meta.details;
    const retaken = meta.details;

    expect(taken).not.toBe(retaken);
    expect(retaken).toEqual(["email"]);
  });

  it("文言だけを上書きした新しいメタ情報を返す", () => {
    const meta = ErrorMeta.create({
      code: "INVALID_EMAIL",
      message: "既定文言",
      requestId: "req-123",
      details: ["email"],
    });
    const overridden = meta.withMessage("入力内容を確認してください。");

    expect(meta.message).toBe("既定文言");
    expect(overridden.code).toBe("INVALID_EMAIL");
    expect(overridden.message).toBe("入力内容を確認してください。");
    expect(overridden.requestId).toBe("req-123");
    expect(overridden.details).toEqual(["email"]);
  });
});

describe("createErrorMeta", () => {
  // ----- 正常系 -----
  it("指定した項目を保持したメタ情報を生成する", () => {
    const meta = createErrorMeta({
      code: "INVALID_EMAIL",
      requestId: "req-123",
      details: ["email"],
    });

    expect(meta).toBeInstanceOf(ErrorMeta);
    expect(meta.code).toBe("INVALID_EMAIL");
    expect(meta.requestId).toBe("req-123");
    expect(meta.details).toEqual(["email"]);
  });

  it("何も指定しなければ、空のメタ情報を生成する", () => {
    const meta = createErrorMeta();

    expect(meta.code).toBe("");
    expect(meta.requestId).toBe("");
    expect(meta.details).toEqual([]);
  });
});

describe("withErrorMeta", () => {
  // ----- 正常系 -----
  it("元の cause chain を保ったままメタ情報を付与する", () => {
    const cause = new Error("元エラー");
    const meta = createErrorMeta({ code: "INVALID_EMAIL" });
    const wrapped = withErrorMeta(cause, meta);

    expect(wrapped.cause).toBe(cause);
    expect(errorMetaFrom(wrapped)).toBe(meta);
  });

  it("undefined のエラーにはメタ情報を付与しない", () => {
    expect(withErrorMeta(undefined, createErrorMeta({ code: "IGNORED" }))).toBeUndefined();
  });
});

describe("withErrorDetails", () => {
  // ----- 正常系 -----
  it("詳細識別子だけを付与する", () => {
    const wrapped = withErrorDetails(new Error("元エラー"), ["email"]);

    expect(errorMetaFrom(wrapped)?.details).toEqual(["email"]);
    expect(errorMetaFrom(wrapped)?.code).toBe("");
  });

  it("undefined のエラーには詳細識別子を付与しない", () => {
    expect(withErrorDetails(undefined, ["email"])).toBeUndefined();
  });
});

describe("errorMetaFrom", () => {
  // ----- 正常系 -----
  it("最も外側のメタ情報と詳細識別子を優先する", () => {
    const inner = withErrorMeta(new Error("元エラー"), createErrorMeta({ code: "INNER" }));
    const outer = withErrorDetails(inner, ["email"]);

    expect(errorMetaFrom(outer)?.details).toEqual(["email"]);
    expect(errorMetaFrom(outer)?.code).toBe("");
  });

  // ----- 異常系 -----
  it("Error でない値からは解決しない", () => {
    expect(errorMetaFrom("エラーではない")).toBeUndefined();
  });

  it("メタ情報を持たないエラーからは解決しない", () => {
    expect(errorMetaFrom(new Error("メタ情報なし"))).toBeUndefined();
  });

  it("循環した cause chain の走査を停止する", () => {
    const error = new Error("循環");
    Object.defineProperty(error, "cause", { value: error });

    expect(errorMetaFrom(error)).toBeUndefined();
  });
});
