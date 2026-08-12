"use client";

import { useCallback } from "react";

import { Button } from "@/components/design-system/action/button/button";
import { ScrollArea } from "@/components/design-system/container/scroll-area/scroll-area";
import { Badge } from "@/components/design-system/display/badge/badge";
import { MediaImage } from "@/components/design-system/display/media-image/media-image";
import { NO_IMAGE_URL } from "@/model/media";
import { type CartLine, useCartStore } from "@/stores/cart-store";
import { cartSubtotal } from "../../cart-total";
import { CartQuantityStepper } from "../cart-quantity-stepper/cart-quantity-stepper";

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
 * カートの中身を画面の脇に出す領域。
 *
 * @remarks
 * カートが空の間は枠ごと描画しません。中身の無い枠が常に場所を取ると、本文の幅がカートの有無で
 * 変わらないぶん、空白だけが残ります。
 *
 * 明細の金額は単価ではなくその行の小計です。数量を変えたときに動く値が単価だと、何を見せられて
 * いるのか判りません。単価は数量によらず常に添えます。数量 1 で省くと、増減のたびに行の高さが
 * 変わって下の内容が飛びます。
 *
 * 画像の代替テキストは空です。商品名を文字で隣に置いているため、画像に名前を持たせると同じ名前が
 * 二度読み上げられます。
 *
 * 小計と「カートに移動」は送りの外に置き、明細だけを局所スクロールさせます。画面の高さを超えた
 * 明細をページのスクロールに委ねると、sticky に収まらない行へ到達できません。
 */
export function CartPanel() {
  const lines = useCartStore((state) => state.lines);

  if (lines.length === 0) {
    return null;
  }

  return (
    <aside
      aria-label="カート"
      className="border-t md:w-72 md:shrink-0 md:border-t-0 md:border-l"
      data-slot="cart-panel"
    >
      <div className="sticky top-14 flex max-h-[calc(100dvh-3.5rem)] flex-col gap-3 p-4">
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
    </aside>
  );
}
