import Link from "next/link";

import { cn } from "@/components/cn";
import type { CartLine } from "@/model/cart/cart";

import { hasBlockingIssue } from "@/model/cart/issue-notice";
import { CartLineIssues } from "../../facade/line-issues/line-issues";
import { CartMatchStockButton } from "../match-stock-button/match-stock-button";
import { CartQuantityStepper } from "../quantity-stepper/quantity-stepper";
import { CartRemoveButton } from "../remove-button/remove-button";

/** `CartLineRow` の props。 */
export type CartLineRowProps = {
  /** 表示する明細。 */
  line: CartLine;
};

/** 商品を引けなかった明細に出す名前。 */
const UNKNOWN_NAME = "取得できない商品";

/** 事情の立った明細に添える、この画面での帰結。 */
const SUBTOTAL_NOTE = "小計には含めていません。";

/**
 * カートの明細 1 行。
 *
 * @remarks
 * 脇の領域と全画面の両方が使います。幅の違いは折り返しで吸収し、器ごとに別の行を持ちません。
 * 狭い器では操作が名前の下へ回り、広い器では同じ行に並びます。
 *
 * **画像も商品状態も出しません。** 契約が返す明細は商品名・単価・数量・事情だけで、画像を出すには
 * 明細の数だけ商品を引くことになります。
 *
 * 金額は単価だけを出します。行ごとの小計を出すには単価と数量を掛ける必要があり、それは金額の
 * 計算をフロントに戻すことになります。合算した値はカートの小計としてバックエンドが返します。
 *
 * 買えない明細は弱めて見せます。**取り除く操作は弱めません** — 買えない明細に対して利用者が取れる
 * 行動がそれだからです。
 *
 * **在庫が足りない明細には、その数へ合わせる操作が生えます。** 事情として今買える数が届いている
 * 以上、利用者に数え直させる理由がありません。在庫が 1 つも無い明細には出しません（合わせる先が
 * ありません）。
 */
export function CartLineRow({ line }: CartLineRowProps) {
  const blocked = hasBlockingIssue(line);
  const label = line.name ?? UNKNOWN_NAME;

  return (
    <li className="flex flex-wrap items-start gap-x-4 gap-y-2 py-4">
      <div className="flex min-w-0 flex-1 basis-40 flex-col gap-1">
        {line.name === null ? (
          <p className="font-emphasis text-muted-foreground text-sm">{UNKNOWN_NAME}</p>
        ) : (
          <Link
            className={cn(
              "line-clamp-2 font-emphasis text-sm hover:underline",
              blocked && "text-muted-foreground",
            )}
            href={`/products/${line.productId}`}
          >
            {line.name}
          </Link>
        )}
        {line.unitPrice === null ? null : (
          <p className={cn("text-sm", blocked ? "text-muted-foreground" : undefined)}>
            {`$${line.unitPrice} / 個`}
          </p>
        )}
        <CartLineIssues
          availableQuantity={line.availableQuantity}
          issues={line.issues}
          note={SUBTOTAL_NOTE}
        />
        {line.availableQuantity === null || line.availableQuantity <= 0 ? null : (
          <CartMatchStockButton
            availableQuantity={line.availableQuantity}
            label={label}
            productId={line.productId}
          />
        )}
      </div>
      <div className="flex items-start gap-1">
        <CartQuantityStepper
          label={label}
          max={line.availableQuantity ?? undefined}
          productId={line.productId}
          quantity={line.quantity}
        />
        <CartRemoveButton label={label} productId={line.productId} quantity={line.quantity} />
      </div>
    </li>
  );
}
