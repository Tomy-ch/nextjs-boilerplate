import { Skeleton } from "@/components/design-system/status/skeleton/skeleton";
import { withPartSpan } from "@/observability/render-span";

/**
 * 購入完了の待機表示。
 *
 * @remarks
 * 控えと送り先の 2 枚が並ぶ形をそのまま枠で出します（`docs/rules.md` #17）。
 */
export const CheckoutCompleteSkeleton = withPartSpan(
  "features/checkout/complete/ui/skeleton/skeleton",
  () => {
    return (
      <div aria-hidden="true" className="flex flex-col gap-6">
        <Skeleton className="h-6 w-64" />
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    );
  },
);
