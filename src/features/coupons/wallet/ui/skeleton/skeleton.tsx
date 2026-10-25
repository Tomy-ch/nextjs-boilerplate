import { Skeleton } from "@/components/design-system/status/skeleton/skeleton";
import { LoadingAnnouncement } from "@/components/shell/loading-announcer/loading-announcer";
import { withPartSpan } from "@/observability/render-span";

/**
 * 待機中に並べる行の数。
 *
 * @remarks
 * 何枚あるかは取得しないと分かりません。受け取り欄は一覧の上にあるため、行の数が実際と
 * 違っても欄の位置は動きません。
 */
export const PLACEHOLDER_ROWS = 3;

const ROWS = Array.from({ length: PLACEHOLDER_ROWS }, (_, index) => index);

/**
 * 保有クーポンの待機表示。
 *
 * @remarks
 * 受け取り欄と同じ高さの器を先に置き、一覧が届いた瞬間に欄が動かないようにします。
 */
export const WalletSkeleton = withPartSpan("features/coupons/wallet/ui/skeleton/skeleton", () => {
  return (
    <div aria-hidden className="flex flex-col gap-8">
      <LoadingAnnouncement />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-full sm:max-w-md" />
      </div>
      <div className="flex flex-col gap-3">
        {ROWS.map((index) => (
          <Skeleton className="h-20 w-full" key={index} />
        ))}
      </div>
    </div>
  );
});
