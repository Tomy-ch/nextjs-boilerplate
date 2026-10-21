import Link from "next/link";

import { Button } from "@/components/design-system/action/button/button";
import { formatNumber } from "@/model/number";
import type { ProductDiscontinueImpact } from "@/model/product/product";
import { withPartSpan } from "@/observability/render-span";

/** `DiscontinueImpactSummary` の props。 */
export type DiscontinueImpactSummaryProps = {
  /** 読み込んだ時点の見積もり。 */
  impact: ProductDiscontinueImpact;
  /** 取り直す先。この画面自身を指す。 */
  reloadHref: string;
};

/** 見積もりの 1 項目。`note` はその数が数えている母集団の注記。 */
type ImpactFigure = {
  readonly key: keyof ProductDiscontinueImpact;
  readonly label: string;
  readonly unit: string;
  readonly note: string;
};

const FIGURES: readonly ImpactFigure[] = [
  {
    key: "affectedCartCount",
    label: "この商品が入っているカート",
    unit: "件",
    note: "持ち主の決まっていないカートも含みます。",
  },
  {
    key: "affectedUserCount",
    label: "代替クーポンを受け取る利用者",
    unit: "人",
    note: "持ち主の決まっていないカートと、退会した利用者は含みません。",
  },
  {
    key: "inProgressPurchaseCount",
    label: "この商品を含む進行中の購入",
    unit: "件",
    note: "1 件でも残っていると廃番にできません。",
  },
];

/**
 * 廃番にしたときの影響の見積もりと、その鮮度。
 *
 * @remarks
 * **ここに出す数は実行の結果ではありません**（`ProductDiscontinueImpact`）。
 *
 * 3 つの数を同じ段に並べますが、数えている母集団はそれぞれ違うため、値ごとに注記を添えます。
 *
 * @see Storybook `Features/Admin/Products/Discontinue/ImpactSummary`
 */
export const DiscontinueImpactSummary = withPartSpan(
  "features/admin/products/discontinue/ui/impact-summary/impact-summary",
  ({ impact, reloadHref }: DiscontinueImpactSummaryProps) => {
    const untouched =
      impact.affectedCartCount === 0 &&
      impact.affectedUserCount === 0 &&
      impact.inProgressPurchaseCount === 0;

    return (
      <section className="rounded-lg border p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-emphasis text-base">影響の見積もり</h2>
            <p className="mt-1 text-muted-foreground text-xs">
              読み込んだ時点の値です。実行したときの結果とは一致しないことがあります。
            </p>
          </div>
          <Button asChild className="shrink-0" size="sm" variant="outline">
            <Link href={reloadHref}>読み込み直す</Link>
          </Button>
        </div>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          {FIGURES.map((figure) => (
            <div className="min-w-0" key={figure.key}>
              <dt className="text-muted-foreground text-sm">{figure.label}</dt>
              <dd className="mt-1 flex items-baseline gap-1">
                <span className="font-emphasis text-2xl tabular-nums">
                  {formatNumber(impact[figure.key])}
                </span>
                <span className="text-muted-foreground text-sm">{figure.unit}</span>
              </dd>
              <dd className="mt-1 text-muted-foreground text-xs">{figure.note}</dd>
            </div>
          ))}
        </dl>
        {untouched ? (
          <p className="mt-4 text-sm">
            この商品はどのカートにも入っていないため、代替クーポンは発行されません。
          </p>
        ) : null}
      </section>
    );
  },
);
