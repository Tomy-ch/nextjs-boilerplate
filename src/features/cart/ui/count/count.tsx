import { ShoppingCartIcon } from "lucide-react";

/** `CartCount` の props。 */
export type CartCountProps = {
  /** カートに入っている明細の数。 */
  count: number;
};

/**
 * カートに入っている点数を header に出す表示。
 *
 * @remarks
 * 0 点のときは数字を出しません。0 を出すと、状態を伝えているのか操作できるのかが記号だけでは
 * 判らなくなります。
 *
 * 数量の合計ではなく行数を出します。同じ商品を 3 個入れた状態で「3」と出ると、3 種類あるように
 * 読めるためです。
 */
export function CartCount({ count }: CartCountProps) {
  return (
    <p className="flex items-center gap-1.5 px-3 py-2 text-sm">
      <ShoppingCartIcon aria-hidden="true" className="size-4" />
      カート
      {count === 0 ? null : (
        <span className="min-w-5 rounded-full bg-foreground px-1.5 text-center text-background text-xs leading-5">
          {count}
        </span>
      )}
    </p>
  );
}
