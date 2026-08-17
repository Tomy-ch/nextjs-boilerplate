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
 * 畳まずに出す明細の数。
 *
 * @remarks
 * カートは契約上 50 行まで入ります。全部を常に並べると、確定するまでの丈がその行数に比例します。
 */
const VISIBLE_LIMIT = 10;

/**
 * 確定する内容の再掲。
 *
 * @remarks
 * 直す手段はカートへ戻す導線 1 本だけです。この画面が持つのは「これで確定してよいか」を
 * 確かめる役目で、直すのはカートの役目です。
 *
 * **多い明細は畳みますが、隠しません。** 払う前に全部を確かめられることがこの画面の役目なので、
 * ページで割って別の画面へ送らず、その場で開ける形にします。件数は畳んだままでも見出しに出ます。
 *
 * 開閉に JS を持ちません。`details` は hydration を待たずに開けるため、読み始めた直後でも
 * 残りへ到達できます。
 */
export function OrderLines({ lines }: OrderLinesProps) {
  const visible = lines.slice(0, VISIBLE_LIMIT);
  const folded = lines.slice(VISIBLE_LIMIT);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{`ご注文内容（全 ${lines.length} 件）`}</CardTitle>
        <CardAction>
          <Button asChild size={BUTTON_SIZE.SMALL} variant={BUTTON_VARIANT.OUTLINE}>
            <Link href={CART_PATH}>カートを修正する</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col">
        <ul className="divide-y">
          {visible.map((line) => (
            <OrderLineRow key={line.productId} line={line} />
          ))}
        </ul>
        {folded.length === 0 ? null : (
          <details className="border-t">
            <summary className="cursor-pointer py-3 text-sm underline focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-offset-2">
              {`残り ${folded.length} 件を表示`}
            </summary>
            <ul className="divide-y border-t">
              {folded.map((line) => (
                <OrderLineRow key={line.productId} line={line} />
              ))}
            </ul>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
