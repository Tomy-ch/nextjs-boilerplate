"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 履歴に積んだ 1 件が overlay のものであることを示す印。
 *
 * @remarks
 * 戻ったときに「自分が積んだ 1 件か」を判定するために置きます。画面遷移が起きると別の状態へ
 * 置き換わるため、印の有無がそのまま「まだ自分が最前面か」を表します。
 */
const OVERLAY_HISTORY_MARKER = "overlayHistory";

/** {@link useOverlayHistory} が受け取る開閉の指定。Radix の Root と同じ形。 */
export type OverlayHistoryOptions = {
  /** 外から制御する場合の開閉状態。 */
  open?: boolean;
  /** 制御しない場合の初期状態。 */
  defaultOpen?: boolean;
  /** 開閉が変わったときに呼ぶ。 */
  onOpenChange?: (open: boolean) => void;
};

/** 開閉状態と、その切り替え口。 */
export type OverlayHistory = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

/**
 * 背面を塞ぐ overlay を、戻る操作で閉じられるようにする。
 *
 * @remarks
 * **開いた時点で履歴を 1 つ積みます。** 戻る操作の意味は「いま被さっているものを外す」であって
 * 「前の画面へ移る」ではありません。積まないと、被せたまま戻ったときに画面ごと移り、読んでいた
 * 内容も入力も失われます（[0053](../../../../docs/adr/0053-ui-component-interaction-seam.md)）。
 *
 * **閉じる操作で閉じたときは、積んだぶんを戻します。** 打ち消さないと、開いて閉じただけで履歴が
 * 1 つ増え、戻る操作が何も起きない回になります。
 *
 * **画面を移す操作で閉じたときは戻しません。** 移った先で戻すと、遷移そのものが取り消されます。
 * 積んだ時点の URL と印の両方を見て、自分の 1 件がまだ最前面にあるときだけ戻します。
 *
 * 制御されている（`open` を渡された）場合も同じように積みます。開閉の持ち主が誰であっても、
 * 戻る操作の意味は変わらないためです。
 */
export function useOverlayHistory({
  open,
  defaultOpen = false,
  onOpenChange,
}: OverlayHistoryOptions): OverlayHistory {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = open !== undefined;
  const currentOpen = isControlled ? open : uncontrolledOpen;
  const pushedRef = useRef(false);

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(next);
      }

      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  useEffect(() => {
    if (!currentOpen) {
      return;
    }

    const pushedHref = window.location.href;

    window.history.pushState({ ...window.history.state, [OVERLAY_HISTORY_MARKER]: true }, "");
    pushedRef.current = true;

    const handlePopState = () => {
      pushedRef.current = false;
      setOpen(false);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);

      const isStillOnTop =
        pushedRef.current &&
        window.location.href === pushedHref &&
        window.history.state?.[OVERLAY_HISTORY_MARKER] === true;

      pushedRef.current = false;

      if (isStillOnTop) {
        window.history.back();
      }
    };
  }, [currentOpen, setOpen]);

  return { open: currentOpen, setOpen };
}
