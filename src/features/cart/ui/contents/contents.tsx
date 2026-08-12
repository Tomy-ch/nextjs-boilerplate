"use client";

import { useCallback } from "react";

import { Button } from "@/components/design-system/action/button/button";
import { ScrollArea } from "@/components/design-system/container/scroll-area/scroll-area";
import { Badge } from "@/components/design-system/display/badge/badge";
import { MediaImage } from "@/components/design-system/display/media-image/media-image";
import { NO_IMAGE_URL } from "@/model/media";
import { type CartLine, useCartStore } from "@/stores/cart-store";

import { cartSubtotal } from "../../total";
import { CartQuantityStepper } from "../quantity-stepper/quantity-stepper";

function CartLineRow({ line }: { line: CartLine }) {
  const setQuantity = useCartStore((state) => state.setQuantity);
  const changeQuantity = useCallback(
    (quantity: number) => setQuantity(line.productId, quantity),
    [setQuantity, line.productId],
  );

  return (
    <li className="flex flex-col items-start gap-2 py-4">
      <MediaImage
        alt=""
        className="w-full rounded-md"
        fallbackSrc={NO_IMAGE_URL}
        sizes="16rem"
        src={line.imageUrl}
      />
      <div className="flex w-full items-start gap-2">
        <p className="line-clamp-2 font-medium text-sm">{line.name}</p>
        <Badge className="shrink-0" variant="secondary">
          {line.statusName}
        </Badge>
      </div>
      <p className="font-medium">{`$${cartSubtotal([line])}`}</p>
      <p className="text-muted-foreground text-xs">{`$${line.price} / 個`}</p>
      <CartQuantityStepper
        label={line.name}
        max={line.stockQuantity}
        onChange={changeQuantity}
        quantity={line.quantity}
      />
    </li>
  );
}

/**
 * カートの中身。小計・カートへの導線・明細を縦に並べる。
 *
 * @remarks
 * 器を持ちません。脇の領域として常設する場合と、狭い幅で本文へ被せる場合の両方から使うため、
 * 位置と大きさは呼び出し元が決めます。
 *
 * 明細の金額は単価ではなくその行の小計です。数量を変えたときに動く値が単価だと、何を見せられて
 * いるのか判りません。単価は数量によらず常に添えます。数量 1 で省くと、増減のたびに行の高さが
 * 変わって下の内容が飛びます。
 *
 * 画像の代替テキストは空です。商品名を文字で隣に置いているため、画像に名前を持たせると同じ名前が
 * 二度読み上げられます。
 *
 * 小計と「カートに移動」は送りの外に置き、明細だけを局所スクロールさせます。高さを超えた明細を
 * 外側のスクロールに委ねると、器が固定されている場合に届かない行が出ます。
 */
export function CartContents() {
  const lines = useCartStore((state) => state.lines);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <p className="flex items-baseline justify-between gap-2">
        <span className="text-muted-foreground text-sm">小計</span>
        <strong className="text-lg">{`$${cartSubtotal(lines)}`}</strong>
      </p>

      <Button className="w-full" size="sm" type="button" variant="outline">
        カートに移動
      </Button>

      <ScrollArea aria-label="カートの明細" className="min-h-0 flex-1">
        <ul className="flex flex-col divide-y">
          {lines.map((line) => (
            <CartLineRow key={line.productId} line={line} />
          ))}
        </ul>
      </ScrollArea>
    </div>
  );
}
