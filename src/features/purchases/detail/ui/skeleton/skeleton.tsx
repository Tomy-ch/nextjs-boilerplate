import { Skeleton } from "@/components/design-system/status/skeleton/skeleton";

/** 枠だけで見せる明細の行数。多すぎると、実際より入っているように見える。 */
const PLACEHOLDER_ROWS = 3;

const ROWS = Array.from({ length: PLACEHOLDER_ROWS }, (_, index) => index);

/**
 * 購入詳細の待機表示。
 *
 * @remarks
 * 出来上がりと同じ段組みで枠だけを出します。控えが先に出て内訳が後から現れる形にすると、
 * 読み始めた位置が動きます。
 */
export function PurchaseDetailSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <Skeleton className="h-4 w-48" />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-lg border p-4">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex flex-col gap-3 rounded-lg border p-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-8 w-32 self-end" />
        </div>
      </div>
      <div className="flex flex-col gap-4 rounded-lg border p-4">
        <Skeleton className="h-5 w-40" />
        {ROWS.map((row) => (
          <div className="flex items-start gap-4" key={row}>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}
