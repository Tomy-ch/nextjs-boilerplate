import { AlertTriangleIcon, InfoIcon } from "lucide-react";

import { cn } from "@/components/cn";
import type { CartLineIssue } from "@/model/cart/cart";

import { cartIssueNotice } from "../../issue-notice";

/** `CartLineIssues` の props。 */
export type CartLineIssuesProps = {
  /** 明細に立った事情。空なら何も出さない。 */
  issues: readonly CartLineIssue[];
  /** 在庫が足りない場合に、今買える上限。 */
  availableQuantity: number | null;
};

/**
 * 明細に立った事情を、その行の中に並べる。
 *
 * @remarks
 * 事情は同時に複数立ちます。1 つに畳まないのは、値が変わったことと在庫が足りないことが利用者に
 * とって別々の判断だからです。
 *
 * 買えない事情だけ配色を変えます。値の変動は買えなくなる事情ではないため、同じ強さで出すと
 * どちらに対処すべきかが読み取れません。
 *
 * 事情が 1 つでも立っていれば、小計に入っていないことを添えます。合算の対象は事情の無い明細
 * だけであり、値が変わっただけの明細も外れます。行の金額と小計が合わない理由は、その行でしか
 * 説明できません。
 */
export function CartLineIssues({ issues, availableQuantity }: CartLineIssuesProps) {
  if (issues.length === 0) {
    return null;
  }

  return (
    <ul className="flex flex-col gap-0.5" data-slot="cart-line-issues">
      {issues.map((issue) => {
        const notice = cartIssueNotice(issue, availableQuantity);

        return (
          <li
            className={cn(
              "flex items-start gap-1.5 text-xs",
              notice.blocking ? "text-destructive" : "text-muted-foreground",
            )}
            key={issue}
          >
            {notice.blocking ? (
              <AlertTriangleIcon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
            ) : (
              <InfoIcon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
            )}
            {notice.message}
          </li>
        );
      })}
      <li className="text-muted-foreground text-xs">小計には含めていません。</li>
    </ul>
  );
}
