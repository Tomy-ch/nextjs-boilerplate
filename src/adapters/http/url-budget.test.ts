import { describe, expect, it } from "vitest";
import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { assertUrlWithinBudget } from "./url-budget";

const url = "https://api.example.test/v1/products?keyword=shoes";

function kindOf(run: () => void): string | undefined {
  try {
    run();
  } catch (error) {
    return findAppError(error)?.kind;
  }

  return undefined;
}

describe("assertUrlWithinBudget", () => {
  // ----- 正常系 -----
  it("予算ちょうどの URL を通す", () => {
    expect(() => assertUrlWithinBudget(url, url.length)).not.toThrow();
  });

  // ----- 異常系 -----
  it("予算を 1 バイト超えた URL を uri-too-long として落とす", () => {
    expect(kindOf(() => assertUrlWithinBudget(url, url.length - 1))).toBe(ErrorKind.URI_TOO_LONG);
  });

  it("符号化していない多バイト文字を、文字数ではなくバイト数で数える", () => {
    const raw = "https://api.example.test/v1/products?keyword=靴";

    expect(kindOf(() => assertUrlWithinBudget(raw, raw.length))).toBe(ErrorKind.URI_TOO_LONG);
  });
});
