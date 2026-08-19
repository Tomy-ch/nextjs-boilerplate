import { Skeleton } from "@/components/design-system/status/skeleton/skeleton";

/** 枠だけで見せる行数。1 画面に収まる範囲に留め、実際より入っているように見せない。 */
const PLACEHOLDER_ROWS = 5;

const ROWS = Array.from({ length: PLACEHOLDER_ROWS }, (_, index) => index);

/**
 * 購入履歴の待機表示。
 *
 * @remarks
 * 実際に並ぶ行と同じ高さ・同じ区切りで枠だけを出します。スピナー 1 つで代用すると、描画された
 * 瞬間に位置が動き、読み始めた場所を見失います。
 */
export function PurchaseHistorySkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-4">
      <Skeleton className="h-4 w-24" />
      <ul className="divide-y rounded-lg border">
        {ROWS.map((row) => (
          <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4" key={row}>
            <div className="flex min-w-0 flex-1 basis-48 flex-col gap-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="h-5 w-16" />
            <Skeleton className="ml-auto h-5 w-20" />
          </li>
        ))}
      </ul>
    </div>
  );
}
