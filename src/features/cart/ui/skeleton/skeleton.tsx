import { Skeleton } from "@/components/design-system/status/skeleton/skeleton";
import { withPartSpan } from "@/observability/render-span";

/** 枠だけで見せる明細の数。1 画面に収まる範囲に留め、実際より入っているように見せない。 */
const PLACEHOLDER_ROWS = 3;

const ROWS = Array.from({ length: PLACEHOLDER_ROWS }, (_, index) => index);

/**
 * カートの待機表示。
 *
 * @remarks
 * 明細の行と小計の枠を実物と同じ高さで出します。スピナー 1 つで代用すると、届いた瞬間に位置が
 * 動きます（`docs/rules.md` #17）。
 */
export const CartSkeleton = withPartSpan("features/cart/ui/skeleton/skeleton", () => {
  return (
    <div aria-hidden="true" className="flex flex-col gap-4">
      <ul className="divide-y rounded-lg border">
        {ROWS.map((row) => (
          <li className="flex items-center gap-4 px-4 py-4" key={row}>
            <Skeleton className="size-16 shrink-0" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-5 w-20" />
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-6 w-24" />
      </div>
      <Skeleton className="h-11 w-full" />
    </div>
  );
});
