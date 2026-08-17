import { AlertTriangleIcon } from "lucide-react";

import { cn } from "@/components/cn";
import type { CartLine } from "@/model/cart/cart";
import { cartIssueNotice, isPurchasable } from "@/model/cart/issue-notice";

/** `OrderLineRow` の props。 */
export type OrderLineRowProps = {
  /** 再掲する明細。 */
  line: CartLine;
};

/** 商品を引けなかった明細に出す名前。 */
const UNKNOWN_NAME = "取得できない商品";

const EXCLUDED_NOTE = "この明細は今回の購入に含まれません。";

/**
 * 確定する内容の 1 行。
 *
 * @remarks
 * **操作を持ちません。** 数量を変えるのも取り除くのもカートの領分で、同じ操作を 2 つの画面に
 * 置くと、どちらで直したのかを利用者も実装も追えなくなります。
 *
 * 今回の購入に載らない明細も落とさずに出します。落とすと、カートで見た明細が確認の画面から
 * 黙って消えることになります。理由はカートが出す言い方をそのまま使い、載らないことだけを
 * この画面の言葉で添えます。
 *
 * **弱めるのは商品名だけで、行ごと薄くはしません。** 行に透過をかけると、載らない理由の文字まで
 * 一緒に薄くなり、地との比が [0100](../../../../../docs/adr/0100-accessibility-target.md) の
 * 要求を割ります。読ませたいのはその理由なので、弱めるのは対象の名前に留めます。
 */
export function OrderLineRow({ line }: OrderLineRowProps) {
  const included = isPurchasable(line);

  return (
    <li className="flex flex-wrap items-start gap-x-4 gap-y-1 py-4">
      <div className="flex min-w-0 flex-1 basis-40 flex-col gap-1">
        <p className={cn("font-medium text-sm", !included && "text-muted-foreground")}>
          {line.name ?? UNKNOWN_NAME}
        </p>
        {line.unitPrice === null ? null : (
          <p className="text-muted-foreground text-sm">{`$${line.unitPrice} / 個`}</p>
        )}
        {included ? null : (
          <ul className="flex flex-col gap-0.5">
            {line.issues.map((issue) => (
              <li className="flex items-start gap-1.5 text-destructive text-xs" key={issue}>
                <AlertTriangleIcon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                {cartIssueNotice(issue, line.availableQuantity).message}
              </li>
            ))}
            <li className="text-muted-foreground text-xs">{EXCLUDED_NOTE}</li>
          </ul>
        )}
      </div>
      <p className="text-sm tabular-nums">{`${line.quantity} 個`}</p>
    </li>
  );
}
