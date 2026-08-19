import { describe, expect, it } from "vitest";
import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { assertRequestTargetWithinBudget } from "./url-budget";

const target = "/v1/products?keyword=shoes";

function kindOf(run: () => void): string | undefined {
  try {
    run();
  } catch (error) {
    return findAppError(error)?.kind;
  }

  return undefined;
}

describe("assertRequestTargetWithinBudget", () => {
  // ----- 正常系 -----
  it("予算ちょうどの要求を通す", () => {
    expect(() => assertRequestTargetWithinBudget(target, target.length)).not.toThrow();
  });

  // ----- 異常系 -----
  it("予算を 1 バイト超えた要求を uri-too-long として落とす", () => {
    expect(kindOf(() => assertRequestTargetWithinBudget(target, target.length - 1))).toBe(
      ErrorKind.URI_TOO_LONG,
    );
  });

  it("多バイト文字を 1 文字としてではなく、バイト数で数える", () => {
    const multibyte = "/v1/products?keyword=靴";

    expect(kindOf(() => assertRequestTargetWithinBudget(multibyte, multibyte.length))).toBe(
      ErrorKind.URI_TOO_LONG,
    );
  });

  it("上限が数値として届いていない要求を通さない", () => {
    expect(kindOf(() => assertRequestTargetWithinBudget(target, Number.NaN))).toBe(
      ErrorKind.URI_TOO_LONG,
    );
  });
});
