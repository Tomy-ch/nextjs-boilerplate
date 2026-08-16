"use client";

import type { ReactNode } from "react";

import { cn } from "@/components/cn";

import { useDockVisibility } from "../../use-dock-visibility";
import { CartDockHandle } from "../dock-handle/dock-handle";

/** `CartSummaryDock` の props。 */
export type CartSummaryDockProps = {
  /** 引き出しの中身。集計は server で組み立てて渡す。 */
  children: ReactNode;
};

/**
 * 集計を画面の下から出す器。
 *
 * @remarks
 * **脇に領域を置けない幅だけで使います**（`lg` 未満。境界の根拠は
 * [0051](../../../../../docs/adr/0051-styling-system.md) §2）。広い幅では本文の脇に貼り付くため、
 * この器は要りません。出し分けを CSS で行うのは、hydration を待つと画面の下に器が現れて内容が
 * 動くためです。
 *
 * **つまみと中身は一緒に動きます。** 動かすのを中身だけにすると、隠れているあいだつまみが中身の
 * 高さぶん浮いて、画面の途中に取り残されます。隠れた状態で画面の下端に残るのがつまみの高さぶんだけに
 * なるよう、器ごと送ります。
 *
 * 出すかどうかの判断は持ちません（[`useDockVisibility`](../../use-dock-visibility.ts)）。この器が
 * 持つのは、出ている / 隠れているをどう見せるかだけです。
 */
export function CartSummaryDock({ children }: CartSummaryDockProps) {
  const { shown, toggle } = useDockVisibility();

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 flex flex-col items-center transition-transform motion-reduce:transition-none lg:hidden",
        // 隠すときはつまみの高さ（h-6 = 1.5rem）だけを残して器ごと下げる。
        shown ? "translate-y-0" : "translate-y-[calc(100%-1.5rem)]",
      )}
      data-slot="cart-summary-dock"
    >
      <CartDockHandle onToggle={toggle} shown={shown} />
      <div
        className="w-full border-t bg-background p-4"
        // 隠れているあいだは送りの対象から外す。画面の外に出ているだけの操作へ focus が入ると、
        // 見えない場所で入力を受けることになる。
        inert={!shown}
      >
        {children}
      </div>
    </div>
  );
}
