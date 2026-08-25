// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useLatched } from "./use-latched";

describe("useLatched", () => {
  // ----- 正常系 -----
  it("最初から満たしていれば true を返す", () => {
    const { result } = renderHook(() => useLatched(true));

    expect(result.current).toBe(true);
  });

  it("まだ満たしていなければ false を返す", () => {
    const { result } = renderHook(() => useLatched(false));

    expect(result.current).toBe(false);
  });

  it("満たした時点で true になる", () => {
    const { result, rerender } = renderHook(({ active }) => useLatched(active), {
      initialProps: { active: false },
    });

    expect(result.current).toBe(false);

    rerender({ active: true });

    expect(result.current).toBe(true);
  });

  it("一度満たしたら、満たさなくなっても true を保つ", () => {
    const { result, rerender } = renderHook(({ active }) => useLatched(active), {
      initialProps: { active: true },
    });

    rerender({ active: false });

    expect(result.current).toBe(true);
  });

  it("満たさないまま何度描き直しても false のまま", () => {
    const { result, rerender } = renderHook(({ active }) => useLatched(active), {
      initialProps: { active: false },
    });

    rerender({ active: false });
    rerender({ active: false });

    expect(result.current).toBe(false);
  });
});
