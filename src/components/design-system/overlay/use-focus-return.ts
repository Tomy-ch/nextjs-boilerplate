"use client";

import { useCallback, useRef } from "react";

/** {@link useFocusReturn} が受け取り、合成して返す auto focus の handler。Radix の Content と同じ形。 */
export type FocusReturnHandlers = {
  onOpenAutoFocus?: (event: Event) => void;
  onCloseAutoFocus?: (event: Event) => void;
};

/** 閉じたときの戻し先。 */
type FocusReturn = {
  /** 開いたときに focus があった要素。 */
  readonly invoker: HTMLElement;
  /** `invoker` が消えていたときに戻す、focus を受けられる最も近い祖先。 */
  readonly fallback: HTMLElement | null;
};

/**
 * 開いたときに focus があった要素から、閉じたときの戻し先を記録する。
 *
 * @remarks
 * `body` からは記録しない。Safari は click で button に focus を移さず、そのときは Radix の既定の
 * 戻し先（Trigger）に任せる。
 *
 * @param element - 開いたときに focus があった要素
 * @returns 戻し先。記録しないときは null
 */
function focusReturnFrom(element: Element | null): FocusReturn | null {
  if (!(element instanceof HTMLElement) || element === element.ownerDocument.body) return null;

  return {
    invoker: element,
    fallback: element.parentElement?.closest<HTMLElement>("[tabindex]") ?? null,
  };
}

/**
 * 記録した戻し先のうち、まだ文書に残っているものを選ぶ。
 *
 * @param focusReturn - 開いたときに記録した戻し先
 * @returns focus を戻す要素。どれも残っていなければ null
 */
function connectedDestination(focusReturn: FocusReturn | null): HTMLElement | null {
  if (focusReturn === null) return null;
  if (focusReturn.invoker.isConnected) return focusReturn.invoker;
  if (focusReturn.fallback?.isConnected) return focusReturn.fallback;

  return null;
}

/**
 * modal を閉じたとき、開いたときに focus があった要素へ focus を戻す handler を作る。
 *
 * @remarks
 * 規則と理由は `src/components/README.md` の "Surfaces Layered over the Content" が持つ。
 * 呼び出し側の handler は先に呼び、そこで `preventDefault()` されたら focus を動かさない。
 *
 * @param handlers - 呼び出し側が Content に渡した auto focus の handler
 * @returns Content の `onOpenAutoFocus` / `onCloseAutoFocus` に渡す handler
 */
export function useFocusReturn({
  onOpenAutoFocus,
  onCloseAutoFocus,
}: FocusReturnHandlers): Required<FocusReturnHandlers> {
  const focusReturn = useRef<FocusReturn | null>(null);

  /** 開いたときに focus があった要素を記録し、呼び出し側の handler を呼ぶ。 */
  const rememberInvoker = useCallback(
    (event: Event) => {
      focusReturn.current = focusReturnFrom(document.activeElement);
      onOpenAutoFocus?.(event);
    },
    [onOpenAutoFocus],
  );

  /** 呼び出し側の handler を呼んだうえで、記録した戻し先へ focus を戻す。 */
  const returnFocus = useCallback(
    (event: Event) => {
      onCloseAutoFocus?.(event);

      const destination = connectedDestination(focusReturn.current);

      focusReturn.current = null;

      if (event.defaultPrevented || destination === null) return;

      event.preventDefault();
      destination.focus();
    },
    [onCloseAutoFocus],
  );

  return { onCloseAutoFocus: returnFocus, onOpenAutoFocus: rememberInvoker };
}
