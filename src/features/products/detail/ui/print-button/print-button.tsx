"use client";

import { PrinterIcon } from "lucide-react";
import { useCallback } from "react";

import { Button } from "@/components/design-system/action/button/button";

/**
 * この画面を印刷する操作。
 *
 * @remarks
 * 印刷基盤（`components/design-system/foundation/print`）は紙面の体裁だけを持ち、印刷の実行は
 * 持ちません。何を印刷したい画面なのかを知っているのは画面の側なので、操作はここに置きます。
 *
 * 自分自身を紙へ出しません。押せない操作が紙面に残ると、その分だけ内容が押し出されます。
 *
 * 印刷の対象を指定していません。`window.print()` は文書全体を対象にし、何を落とすかは
 * `print-hidden` を付けた各要素が決めます。ここで範囲を切ると、同じ判断が操作側と表示側の
 * 2 か所に分かれます。
 */
export function PrintButton() {
  const print = useCallback(() => {
    window.print();
  }, []);

  return (
    <Button className="print-hidden" onClick={print} size="sm" type="button" variant="outline">
      <PrinterIcon aria-hidden="true" className="size-4" />
      印刷する
    </Button>
  );
}
