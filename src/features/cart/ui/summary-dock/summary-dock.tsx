"use client";

import { ChevronUpIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useState } from "react";

import { cn } from "@/components/cn";

import { useScrollDirection } from "../../use-scroll-direction";

/** `CartSummaryDock` の props。 */
export type CartSummaryDockProps = {
  /** 引き出しの中身。集計は server で組み立てて渡す。 */
  children: ReactNode;
};

const OPEN_LABEL = "小計を表示する";
const CLOSE_LABEL = "小計を隠す";

/**
 * 集計を画面の下から出す引き出し。
 *
 * @remarks
 * **脇に領域を置けない幅だけで使います**（`lg` 未満。境界の根拠は
 * [0051](../../../../../docs/adr/0051-styling-system.md) §2）。広い幅では本文の脇に貼り付くため、
 * この器は要りません。出し分けを CSS で行うのは、hydration を待つと画面の下に器が現れて内容が
 * 動くためです。
 *
 * **下へ読み進めるあいだだけ出します。** 明細が増えるほど小計は画面外へ遠ざかり、確かめるために
 * 末尾まで送ることになります。逆に上へ戻るときは読みたいのが明細そのものなので、置いて行かれる形で
 * 隠します。
 *
 * **引き手はいつでも出ています。** 向きに任せるだけだと、下へ動かせない位置（末尾や短い一覧）で
 * 小計へ到達する手段が無くなります。引き手で開いた状態はスクロールの向きより優先し、閉じるのも
 * 引き手で行います。自分で開けたものが勝手に消えると、操作と結果が対応しません。
 *
 * **引き手と中身は一緒に動きます。** 動かすのを中身だけにすると、隠れているあいだ引き手が中身の
 * 高さぶん浮いて、画面の途中に取り残されます。隠れた状態で画面の下端に残るのが引き手の高さぶんだけに
 * なるよう、器ごと送ります。
 */
export function CartSummaryDock({ children }: CartSummaryDockProps) {
  const [pinned, setPinned] = useState(false);
  const direction = useScrollDirection();
  const toggle = useCallback(() => setPinned((current) => !current), []);
  const shown = pinned || direction === "down";

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 flex flex-col items-center transition-transform motion-reduce:transition-none lg:hidden",
        // 隠すときは引き手の高さ（h-6 = 1.5rem）だけを残して器ごと下げる。
        shown ? "translate-y-0" : "translate-y-[calc(100%-1.5rem)]",
      )}
      data-slot="cart-summary-dock"
    >
      <button
        aria-expanded={shown}
        aria-label={shown ? CLOSE_LABEL : OPEN_LABEL}
        className="flex h-6 w-16 cursor-pointer items-center justify-center rounded-t-md border border-b-0 bg-background"
        onClick={toggle}
        type="button"
      >
        <ChevronUpIcon
          aria-hidden="true"
          className={cn(
            "size-4 transition-transform motion-reduce:transition-none",
            shown && "rotate-180",
          )}
        />
      </button>
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
