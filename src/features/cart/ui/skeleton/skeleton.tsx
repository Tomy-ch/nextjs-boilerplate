import { Skeleton } from "@/components/design-system/status/skeleton/skeleton";

/** 枠だけで見せる明細の行数。多すぎると、実際より入っているように見える。 */
const PLACEHOLDER_ROWS = 3;

const ROWS = Array.from({ length: PLACEHOLDER_ROWS }, (_, index) => index);

/**
 * カートの待機表示。
 *
 * @remarks
 * 出来上がりと同じ段組みで枠だけを出します。明細が先に出て集計が後から現れる形にすると、
 * 読み始めた位置が動きます。
 */
export function CartSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-8 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        {ROWS.map((row) => (
          <div className="flex items-start gap-4" key={row}>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-8 w-28" />
          </div>
        ))}
      </div>
      <div className="flex w-full flex-col gap-4 rounded-lg border p-4 lg:w-80">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
