// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useActionResultFreshness } from "./use-action-result-freshness";

describe("useActionResultFreshness", () => {
  // ----- 正常系 -----
  it("最初は下げられていない", () => {
    const { result } = renderHook(() => useActionResultFreshness("first"));

    expect(result.current.dismissed).toBe(false);
  });

  it("下げた印を覚える", () => {
    const { result } = renderHook(() => useActionResultFreshness("first"));

    act(() => result.current.dismiss());

    expect(result.current.dismissed).toBe(true);
  });

  it("結果が入れ替わったら、下げた印を戻す。押しても何も起きない画面にしないため", () => {
    const { result, rerender } = renderHook((state: string) => useActionResultFreshness(state), {
      initialProps: "first",
    });

    act(() => result.current.dismiss());
    rerender("second");

    expect(result.current.dismissed).toBe(false);
    expect(result.current.resultIsNew).toBe(true);
  });

  it("同じ結果のまま描き直しても、入れ替わったとは見なさない", () => {
    const { result, rerender } = renderHook((state: string) => useActionResultFreshness(state), {
      initialProps: "first",
    });

    rerender("first");

    expect(result.current.resultIsNew).toBe(false);
  });
});
