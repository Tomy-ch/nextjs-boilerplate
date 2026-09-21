// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import { boundaryFeedback, isStaleActionError } from "./boundary-feedback";

const { isUnrecognizedActionError } = vi.hoisted(() => ({
  isUnrecognizedActionError: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  unstable_isUnrecognizedActionError: isUnrecognizedActionError,
}));

afterEach(() => {
  vi.unstubAllGlobals();
  isUnrecognizedActionError.mockReset();
});

describe("isStaleActionError", () => {
  // ----- 正常系 -----
  it("版が揃っていない失敗を、framework の述語で見分ける", () => {
    isUnrecognizedActionError.mockReturnValue(true);

    expect(isStaleActionError(new Error("古い識別子"))).toBe(true);
  });

  // ----- 異常系 -----
  it("ほかの失敗は見分けない", () => {
    isUnrecognizedActionError.mockReturnValue(false);

    expect(isStaleActionError(new Error("取得に失敗"))).toBe(false);
  });
});

describe("boundaryFeedback", () => {
  // ----- 正常系 -----
  it("版が揃っていない失敗では、読み込み直しへ誘導する", () => {
    isUnrecognizedActionError.mockReturnValue(true);
    const reload = vi.fn();

    vi.stubGlobal("location", { reload });

    const { error, onRetry } = boundaryFeedback(
      Object.assign(new Error("skew"), { digest: "d1" }),
      vi.fn(),
    );

    onRetry();

    expect(error.kind).toBe("stale");
    expect(error.requestId).toBe("d1");
    expect(reload).toHaveBeenCalledOnce();
  });

  it("ほかの失敗では、その境界を描き直す", () => {
    isUnrecognizedActionError.mockReturnValue(false);
    const reset = vi.fn();

    const { error, onRetry } = boundaryFeedback(new Error("取得に失敗"), reset);

    onRetry();

    expect(error.kind).toBe("server");
    expect(reset).toHaveBeenCalledOnce();
  });

  // ----- 異常系 -----
  it("識別子を持たない失敗でも組み立てる", () => {
    isUnrecognizedActionError.mockReturnValue(false);

    expect(boundaryFeedback(new Error("取得に失敗"), vi.fn()).error.requestId).toBeUndefined();
  });
});
