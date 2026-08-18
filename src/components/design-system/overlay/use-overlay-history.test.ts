// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useOverlayHistory } from "./use-overlay-history";

const back = vi.fn();

beforeEach(() => {
  window.history.replaceState(null, "", "/base");
  vi.spyOn(window.history, "back").mockImplementation(back);
});

afterEach(() => {
  back.mockReset();
  vi.restoreAllMocks();
});

/** 戻る操作を模す。jsdom は `history.back()` で popstate を出さないため、印だけ外して出す。 */
function goBack() {
  window.history.replaceState(null, "", "/base");
  window.dispatchEvent(new PopStateEvent("popstate"));
}

describe("useOverlayHistory", () => {
  // ----- 正常系 -----
  it("開いた時点で、自分のものと判る 1 件を積む", () => {
    renderHook(() => useOverlayHistory({ open: true }));

    expect(window.history.state).toMatchObject({ overlayHistory: expect.any(String) });
  });

  it("開いていない間は積まない", () => {
    renderHook(() => useOverlayHistory({ open: false }));

    expect(window.history.state).toBeNull();
  });

  it("戻る操作で閉じる", () => {
    const onOpenChange = vi.fn();

    renderHook(() => useOverlayHistory({ onOpenChange, open: true }));
    act(goBack);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("戻る操作で閉じたときは、履歴を戻し直さない", () => {
    const { rerender } = renderHook((props: { open: boolean }) => useOverlayHistory(props), {
      initialProps: { open: true },
    });

    act(goBack);
    rerender({ open: false });

    expect(back).not.toHaveBeenCalled();
  });

  it("閉じる操作で閉じたときは、積んだぶんを戻す", () => {
    const { rerender } = renderHook((props: { open: boolean }) => useOverlayHistory(props), {
      initialProps: { open: true },
    });

    rerender({ open: false });

    expect(back).toHaveBeenCalledOnce();
  });

  it("制御しない場合は、自分で開閉を持つ", () => {
    const { result } = renderHook(() => useOverlayHistory({ defaultOpen: false }));

    expect(result.current.open).toBe(false);

    act(() => result.current.setOpen(true));

    expect(result.current.open).toBe(true);
    expect(window.history.state).toMatchObject({ overlayHistory: expect.any(String) });
  });

  it("制御される場合、切り替えの求めは持ち主へ渡すだけにする", () => {
    const onOpenChange = vi.fn();
    const { result } = renderHook(() => useOverlayHistory({ onOpenChange, open: false }));

    act(() => result.current.setOpen(true));

    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(result.current.open).toBe(false);
  });

  it("重ねて開いた内側は、外側の 1 件へ戻った時点で閉じる", () => {
    const onOpenChange = vi.fn();

    renderHook(() => useOverlayHistory({ open: true }));

    const outerState = window.history.state;

    renderHook(() => useOverlayHistory({ onOpenChange, open: true }));

    act(() => {
      window.history.replaceState(outerState, "", "/base");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  // ----- 異常系 -----

  it("自分の 1 件に留まったままの popstate では閉じない", () => {
    const onOpenChange = vi.fn();

    renderHook(() => useOverlayHistory({ onOpenChange, open: true }));
    act(() => window.dispatchEvent(new PopStateEvent("popstate")));

    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("画面を移したあとは、積んだぶんを戻さない", () => {
    const { rerender } = renderHook((props: { open: boolean }) => useOverlayHistory(props), {
      initialProps: { open: true },
    });

    window.history.pushState(null, "", "/moved");
    rerender({ open: false });

    expect(back).not.toHaveBeenCalled();
  });

  it("自分の印が最前面に無いときは、積んだぶんを戻さない", () => {
    const { rerender } = renderHook((props: { open: boolean }) => useOverlayHistory(props), {
      initialProps: { open: true },
    });

    window.history.replaceState(null, "", "/base");
    rerender({ open: false });

    expect(back).not.toHaveBeenCalled();
  });
});
