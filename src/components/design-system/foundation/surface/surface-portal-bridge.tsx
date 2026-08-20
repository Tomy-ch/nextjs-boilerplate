"use client";

import { useEffect } from "react";

import { SURFACE_ATTRIBUTE, type Surface } from "./surface.definition";

/** `SurfacePortalBridge` の props。 */
export type SurfacePortalBridgeProps = {
  /** 部分木が名乗っている系統。 */
  surface: Surface;
};

/**
 * 部分木の系統を、Portal の出口（`body`）へ届ける。
 *
 * @remarks
 * **描画するものを持ちません。** `Dialog` / `Popover` / `DropdownMenu` / `Sheet` / `Tooltip` /
 * `ContextMenu` は Radix の Portal で `document.body` 直下へ出るため、系統の属性を本文の内側に
 * 置くだけでは overlay の中身が属性の外へ落ちます（`tokens/README.md`「属性を置く場所は、Portal
 * を含む位置でなければならない」）。この component はその出口にも同じ系統を載せます。
 *
 * **本文の側の属性を置き換えるものではありません。** 本文は server が描いた時点で正しい系統を
 * 持ち、初回の描画に切り替わりが現れません。ここが受け持つのは、**hydration より前には存在
 * し得ない** overlay の中身だけです —— overlay はいずれも操作で開くもので、開けるのは
 * hydration の後だからです。
 *
 * **外れるときに消します。** 系統を持つ部分木から出ても `body` に残ると、次に開いた overlay が
 * 前の画面の系統で描かれます。
 *
 * **消すのは自分が置いた値だけです。** `body` の属性を書くのはここだけとは限らず（`README.md`）、
 * React は 1 つのコミットの中で後始末を新しい effect よりも先に走らせます。無条件に消すと、直前に
 * 別の書き手が置いた値まで落とします。
 *
 * @example
 * ```tsx
 * <div data-surface="admin">
 *   <SurfacePortalBridge surface="admin" />
 *   {children}
 * </div>
 * ```
 *
 * @param props.surface - 部分木が名乗っている系統。属性に載る値と同じものを渡す
 * @see Storybook `Foundation/Surface`
 */
export function SurfacePortalBridge({ surface }: SurfacePortalBridgeProps): null {
  useEffect(() => {
    document.body.setAttribute(SURFACE_ATTRIBUTE, surface);

    return () => {
      if (document.body.getAttribute(SURFACE_ATTRIBUTE) === surface) {
        document.body.removeAttribute(SURFACE_ATTRIBUTE);
      }
    };
  }, [surface]);

  return null;
}
