import Link from "next/link";

import { Button } from "@/components/design-system/action/button/button";
import {
  BUTTON_SIZE,
  BUTTON_VARIANT,
} from "@/components/design-system/action/button/button.definition";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/design-system/display/card/card";
import type { CartLine } from "@/model/cart/cart";

import { CART_PATH } from "../../../paths";
import { OrderLineRow } from "../order-line-row/order-line-row";

/** `OrderLines` の props。 */
export type OrderLinesProps = {
  /** 再掲する明細。 */
  lines: readonly CartLine[];
};

/**
 * 確定する内容の再掲。
 *
 * @remarks
 * 直す手段はカートへ戻す導線 1 本だけです。この画面が持つのは「これで確定してよいか」を
 * 確かめる役目で、直すのはカートの役目です。
 */
export function OrderLines({ lines }: OrderLinesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>ご注文内容</CardTitle>
        <CardAction>
          <Button asChild size={BUTTON_SIZE.SMALL} variant={BUTTON_VARIANT.OUTLINE}>
            <Link href={CART_PATH}>カートを修正する</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {lines.map((line) => (
            <OrderLineRow key={line.productId} line={line} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
