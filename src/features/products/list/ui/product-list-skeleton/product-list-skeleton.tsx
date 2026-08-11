import { Skeleton } from "@/components/design-system/status/skeleton/skeleton";

/** 一覧の待機表示で並べる件数。実際の初期取得件数と揃えず、折り返し 2 段分に留める。 */
const PLACEHOLDER_COUNT = 6;

/**
 * 一覧の待機表示。
 *
 * @remarks
 * 実際に並ぶものと同じ形・同じ段組みで枠だけを出します。スピナー 1 つで代用すると、
 * 描画された瞬間に位置が動き、読み始めた場所を見失います。
 */
export function ProductListSkeleton() {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: PLACEHOLDER_COUNT }, (_, index) => index).map((index) => (
        <li key={index} className="space-y-3 rounded-lg border p-4">
          <Skeleton className="aspect-[4/3] w-full" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </li>
      ))}
    </ul>
  );
}
