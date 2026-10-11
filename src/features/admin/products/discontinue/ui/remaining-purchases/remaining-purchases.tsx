import Link from "next/link";

import { Button } from "@/components/design-system/action/button/button";
import { Skeleton } from "@/components/design-system/status/skeleton/skeleton";
import { formatDateTime } from "@/model/datetime";
import { formatMoney } from "@/model/money";
import { formatNumber } from "@/model/number";
import type { PurchaseHistoryEntry } from "@/model/purchase/purchase";
import { withPartSpan } from "@/observability/render-span";

/**
 * 残っている購入の読み込みの状態。
 *
 * @remarks
 * 見積もりとは別に読むため、こちらだけが待っている・読めなかった、が起こります。
 */
export type RemainingPurchasesState =
  | { readonly status: "loading" }
  | {
      readonly status: "ready";
      readonly items: readonly PurchaseHistoryEntry[];
      /** 並べたものが全件ではないか。続きがあるか、見積もりの件数に届かないときに立つ。 */
      readonly partial: boolean;
    }
  | { readonly status: "failed" };

/** `DiscontinueRemainingPurchases` の props。 */
export type DiscontinueRemainingPurchasesProps = {
  /** 読み込みの状態。 */
  state: RemainingPurchasesState;
  /** 取り直す先。この画面自身を指す。 */
  reloadHref: string;
};

/** 待機中に並べる行の数。実際の件数には合わせない。 */
const PLACEHOLDER_ROWS = 3;

/**
 * 廃番を拒ませている、進行中の購入。
 *
 * @remarks
 * **どこへもつながりません。** 管理側には購入 1 件を開く面が無く、押しても何も起きない行に
 * なるためです。行が答えるのは「どの購入が、いまどの状態か」だけです。
 *
 * **全件でないときはそう書きます。** 並べる件数には上限があり、見積もりの後に購入が増えたときも
 * 並びが件数に届きません。
 *
 * 読めなかったときは見積もりを巻き込まず、この場所だけで伝えます。
 *
 * @see Storybook `Features/Admin/Products/Discontinue/RemainingPurchases`
 */
export const DiscontinueRemainingPurchases = withPartSpan(
  "features/admin/products/discontinue/ui/remaining-purchases/remaining-purchases",
  ({ state, reloadHref }: DiscontinueRemainingPurchasesProps) => {
    return (
      <section className="rounded-lg border p-4">
        <h2 className="font-emphasis text-base">残っている進行中の購入</h2>
        <p className="mt-1 text-muted-foreground text-sm">
          完了・キャンセル・配達済みのいずれかになるまで、この商品は廃番にできません。
        </p>

        {state.status === "loading" ? (
          <div aria-hidden="true" className="mt-4 space-y-3">
            {Array.from({ length: PLACEHOLDER_ROWS }, (_, index) => index).map((index) => (
              <Skeleton className="h-10 w-full" key={index} />
            ))}
          </div>
        ) : null}

        {state.status === "failed" ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">残っている購入を読み込めませんでした。</p>
            <Button asChild size="sm" variant="outline">
              <Link href={reloadHref}>読み込み直す</Link>
            </Button>
          </div>
        ) : null}

        {state.status === "ready" ? (
          <>
            <ul className="mt-4 flex flex-col divide-y">
              {state.items.map((purchase) => (
                <li
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3"
                  key={purchase.code}
                >
                  <span className="flex min-w-0 flex-wrap items-baseline gap-x-3">
                    <span className="break-all font-mono text-sm">{purchase.code}</span>
                    <span className="text-sm">{purchase.statusName}</span>
                  </span>
                  <span className="text-muted-foreground text-sm tabular-nums">
                    {formatDateTime(purchase.orderedAt)} / {formatMoney(purchase.totalAmount)}
                  </span>
                </li>
              ))}
            </ul>
            {state.partial ? (
              <p className="mt-2 text-muted-foreground text-xs">
                {formatNumber(state.items.length)}{" "}
                件を表示しています。ほかにも進行中の購入があり、ここには並んでいません。
              </p>
            ) : null}
          </>
        ) : null}
      </section>
    );
  },
);
