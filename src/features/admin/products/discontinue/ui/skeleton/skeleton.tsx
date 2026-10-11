import { Skeleton } from "@/components/design-system/status/skeleton/skeleton";
import { withPartSpan } from "@/observability/render-span";

/**
 * 見積もり・条件の欄・送信を、実際と同じ並びで出す待機表示。
 *
 * @remarks
 * 実行の入口が出るか、残っている購入が並ぶかは見積もりが届くまで判りません。待機表示はどちらとも
 * 約束せず、見積もりの枠と、その下に続く領域の高さだけを示します。
 *
 * @see Storybook `Features/Admin/Products/Discontinue/Skeleton`
 */
export const AdminProductDiscontinueSkeleton = withPartSpan(
  "features/admin/products/discontinue/ui/skeleton/skeleton",
  () => {
    return (
      <div aria-hidden="true" className="space-y-6">
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-40" />
      </div>
    );
  },
);
