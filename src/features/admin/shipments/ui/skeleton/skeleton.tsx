import { Skeleton } from "@/components/design-system/status/skeleton/skeleton";

/** 待機表示で並べる組の数。実際の件数と揃えず、便が縦に積まれる形が伝わる数に留める。 */
const PLACEHOLDER_GROUPS = 3;

/**
 * 発送待ちの待機表示。
 *
 * @remarks
 * 実際に並ぶ組と同じ高さで枠だけを出します。スピナー 1 つで代用すると、描画された瞬間に高さが
 * 変わり、読み始めた位置が動きます。
 */
export function ShipmentQueueSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-4">
      {Array.from({ length: PLACEHOLDER_GROUPS }, (_, index) => index).map((index) => (
        <Skeleton className="h-48 w-full" key={index} />
      ))}
    </div>
  );
}
