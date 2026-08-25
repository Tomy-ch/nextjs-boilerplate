import { Skeleton } from "@/components/design-system/status/skeleton/skeleton";
import { withPartSpan } from "@/observability/render-span";

/**
 * 在庫を補充する画面の待機表示。
 *
 * @remarks
 * 現在の在庫の枠・向きの選択・数量の欄・送信の並びを、実際と同じ高さで出します。一覧の待機表示を
 * 流用すると、表の行が並んでからフォームが現れることになり、何を待っているかが伝わりません。
 */
export const AdminProductStockSkeleton = withPartSpan(
  "features/admin/products/stock/ui/skeleton/skeleton",
  () => {
    return (
      <div aria-hidden="true" className="space-y-6">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-16 w-full max-w-xs" />
        <Skeleton className="h-10 w-40" />
      </div>
    );
  },
);
