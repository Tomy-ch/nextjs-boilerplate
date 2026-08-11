import { describe, expect, it } from "vitest";
import { ErrorKind } from "@/errors/error-kind";
import {
  backoffDelayMs,
  isRetryableMethod,
  isRetryableOutcome,
  retryAfterDelayMs,
  toErrorKind,
} from "./retry-policy";

describe("isRetryableMethod", () => {
  // ----- 正常系 -----
  it("冪等なメソッドを再試行の対象にする", () => {
    expect(
      ["GET", "HEAD", "PUT", "DELETE", "OPTIONS"].map((m) => isRetryableMethod(m, false)),
    ).toEqual([true, true, true, true, true]);
  });

  it("小文字のメソッドも同じに扱う", () => {
    expect(isRetryableMethod("get", false)).toBe(true);
  });

  it("冪等の宣言があれば POST も対象にする", () => {
    expect(isRetryableMethod("POST", true)).toBe(true);
  });
  // ----- 異常系 -----
  it("宣言の無い POST を対象から外す", () => {
    expect(isRetryableMethod("POST", false)).toBe(false);
  });

  it("宣言の無い PATCH を対象から外す", () => {
    expect(isRetryableMethod("PATCH", false)).toBe(false);
  });
});

describe("isRetryableOutcome", () => {
  // ----- 正常系 -----
  it("応答が無い失敗を再試行の対象にする", () => {
    expect(isRetryableOutcome({})).toBe(true);
  });

  it("5xx を再試行の対象にする", () => {
    expect(isRetryableOutcome({ status: 503 })).toBe(true);
  });

  it("429 を再試行の対象にする", () => {
    expect(isRetryableOutcome({ status: 429 })).toBe(true);
  });
  // ----- 異常系 -----
  it("要求そのものが誤っている 4xx を対象から外す", () => {
    expect(isRetryableOutcome({ status: 400 })).toBe(false);
  });

  it("成功応答を対象から外す", () => {
    expect(isRetryableOutcome({ status: 200 })).toBe(false);
  });
});

describe("backoffDelayMs", () => {
  // ----- 正常系 -----
  it("試行ごとに待ち時間の上限を倍にする", () => {
    const ceilings = [1, 2, 3].map((attempt) => backoffDelayMs(attempt, () => 0.999999));

    expect(ceilings).toEqual([99, 199, 399]);
  });

  it("上限を超えて伸ばさない", () => {
    expect(backoffDelayMs(20, () => 0.999999)).toBe(1999);
  });

  it("同じ試行でも乱数で待ち時間を散らす", () => {
    expect([0, 0.5].map((value) => backoffDelayMs(3, () => value))).toEqual([0, 200]);
  });
});

describe("retryAfterDelayMs", () => {
  // ----- 正常系 -----
  it("秒数の指定をミリ秒へ直す", () => {
    expect(retryAfterDelayMs("2", 0)).toBe(2_000);
  });

  it("日時の指定を現在時刻からの差にする", () => {
    const now = Date.parse("2026-08-07T00:00:00.000Z");

    expect(retryAfterDelayMs("Fri, 07 Aug 2026 00:00:03 GMT", now)).toBe(3_000);
  });
  // ----- 異常系 -----
  it("ヘッダが無ければ指示なしとする", () => {
    expect(retryAfterDelayMs(null, 0)).toBeNull();
  });

  it("解釈できない値を指示なしとする", () => {
    expect(retryAfterDelayMs("すぐ", 0)).toBeNull();
  });

  it("負の秒数を指示なしとする", () => {
    expect(retryAfterDelayMs("-1", 0)).toBeNull();
  });

  it("過去の日時を待ち時間 0 にする", () => {
    const now = Date.parse("2026-08-07T00:00:10.000Z");

    expect(retryAfterDelayMs("Fri, 07 Aug 2026 00:00:00 GMT", now)).toBe(0);
  });
});

describe("toErrorKind", () => {
  // ----- 正常系 -----
  it("契約が定める status を対応する分類へ写す", () => {
    const kinds = [400, 401, 403, 404, 409, 413, 415, 422, 429, 499, 501, 503].map(toErrorKind);

    expect(kinds).toEqual([
      ErrorKind.INVALID_ARGUMENT,
      ErrorKind.UNAUTHENTICATED,
      ErrorKind.PERMISSION_DENIED,
      ErrorKind.NOT_FOUND,
      ErrorKind.CONFLICT,
      ErrorKind.PAYLOAD_TOO_LARGE,
      ErrorKind.UNSUPPORTED_MEDIA_TYPE,
      ErrorKind.VALIDATION,
      ErrorKind.TOO_MANY_REQUESTS,
      ErrorKind.CANCELED,
      ErrorKind.UNIMPLEMENTED,
      ErrorKind.UNAVAILABLE,
    ]);
  });
  // ----- 異常系 -----
  it("対応表に無い status を internal へ矯正する", () => {
    expect(toErrorKind(418)).toBe(ErrorKind.INTERNAL);
  });

  it("500 を internal にする", () => {
    expect(toErrorKind(500)).toBe(ErrorKind.INTERNAL);
  });
});
