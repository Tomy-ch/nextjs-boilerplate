import { Skeleton } from "@/components/design-system/status/skeleton/skeleton";
import { withPartSpan } from "@/observability/render-span";

/**
 * 購入詳細の待機表示。
 *
 * @remarks
 * 明細と送り先の 2 枚が並ぶ形をそのまま枠で出します（`docs/rules.md` #17）。
 */
export const PurchaseDetailSkeleton = withPartSpan(
  "features/purchases/detail/ui/skeleton/skeleton",
  () => {
    return (
      <div aria-hidden="true" className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    );
  },
);
