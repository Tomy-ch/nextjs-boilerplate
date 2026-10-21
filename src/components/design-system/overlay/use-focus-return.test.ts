// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useFocusReturn } from "./use-focus-return";

afterEach(() => {
  document.body.replaceChildren();
});

function autoFocusEvent() {
  return new Event("autofocus", { cancelable: true });
}

function mountInvoker() {
  const region = document.createElement("section");
  const invoker = document.createElement("button");

  region.tabIndex = 0;
  region.append(invoker);
  document.body.append(region);
  invoker.focus();

  return { invoker, region };
}

describe("useFocusReturn", () => {
  // ----- 正常系 -----
  it("閉じるとき、開いたときに focus があった要素へ戻し、既定の戻し先を止める", () => {
    const { invoker } = mountInvoker();
    const { result } = renderHook(() => useFocusReturn({}));
    const closing = autoFocusEvent();

    result.current.onOpenAutoFocus(autoFocusEvent());
    invoker.blur();
    result.current.onCloseAutoFocus(closing);

    expect(invoker).toHaveFocus();
    expect(closing.defaultPrevented).toBe(true);
  });

  it("開いたときの要素が消えていたら、開いた時点で focus できた最も近い祖先へ戻す", () => {
    const { invoker, region } = mountInvoker();
    const { result } = renderHook(() => useFocusReturn({}));

    result.current.onOpenAutoFocus(autoFocusEvent());
    invoker.remove();
    result.current.onCloseAutoFocus(autoFocusEvent());

    expect(region).toHaveFocus();
  });

  it("開いたときの要素も祖先も消えていたら、既定の戻し先に任せる", () => {
    const { region } = mountInvoker();
    const { result } = renderHook(() => useFocusReturn({}));
    const closing = autoFocusEvent();

    result.current.onOpenAutoFocus(autoFocusEvent());
    region.remove();
    result.current.onCloseAutoFocus(closing);

    expect(closing.defaultPrevented).toBe(false);
  });

  it("開いたときに focus が body にあったら、既定の戻し先に任せる", () => {
    const { result } = renderHook(() => useFocusReturn({}));
    const closing = autoFocusEvent();

    result.current.onOpenAutoFocus(autoFocusEvent());
    result.current.onCloseAutoFocus(closing);

    expect(closing.defaultPrevented).toBe(false);
  });

  it("呼び出し側の handler へ、同じ event を渡して呼ぶ", () => {
    mountInvoker();
    const onOpenAutoFocus = vi.fn();
    const onCloseAutoFocus = vi.fn();
    const { result } = renderHook(() => useFocusReturn({ onCloseAutoFocus, onOpenAutoFocus }));
    const opening = autoFocusEvent();
    const closing = autoFocusEvent();

    result.current.onOpenAutoFocus(opening);
    result.current.onCloseAutoFocus(closing);

    expect(onOpenAutoFocus).toHaveBeenCalledWith(opening);
    expect(onCloseAutoFocus).toHaveBeenCalledWith(closing);
  });

  it("呼び出し側の onCloseAutoFocus が既定を止めたら、focus を動かさない", () => {
    const { invoker } = mountInvoker();
    const elsewhere = document.createElement("button");
    document.body.append(elsewhere);
    const { result } = renderHook(() =>
      useFocusReturn({
        onCloseAutoFocus: (event) => {
          event.preventDefault();
          elsewhere.focus();
        },
      }),
    );

    result.current.onOpenAutoFocus(autoFocusEvent());
    result.current.onCloseAutoFocus(autoFocusEvent());

    expect(elsewhere).toHaveFocus();
    expect(invoker).not.toHaveFocus();
  });

  it("一度戻したら記録を捨て、次に開くまで focus を動かさない", () => {
    const { invoker } = mountInvoker();
    const { result } = renderHook(() => useFocusReturn({}));
    const second = autoFocusEvent();

    result.current.onOpenAutoFocus(autoFocusEvent());
    result.current.onCloseAutoFocus(autoFocusEvent());
    invoker.blur();
    result.current.onCloseAutoFocus(second);

    expect(second.defaultPrevented).toBe(false);
    expect(invoker).not.toHaveFocus();
  });
});
