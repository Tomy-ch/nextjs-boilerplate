import { Skeleton } from "@/components/design-system/status/skeleton/skeleton";
import { withPartSpan } from "@/observability/render-span";

/** 待機表示で並べる欄の群の数。コード・値引き・対象・期間・上限の 5 つ。 */
const PLACEHOLDER_GROUPS = 5;

/**
 * 欄の群と送る操作を、実際と同じ並びで出す待機表示。
 *
 * @remarks
 * 待つのはカテゴリの候補だけですが、欄の群ごと待たせます。範囲の欄は候補が無いと組めず、
 * それだけ遅れて差し込むと、打ち始めた欄の位置が後から動きます。
 *
 * @see Storybook `Features/Admin/Campaigns/New/Skeleton`
 */
export const AdminCampaignCreateSkeleton = withPartSpan(
  "features/admin/campaigns/new/ui/skeleton/skeleton",
  () => {
    return (
      <div aria-hidden="true" className="grid gap-8">
        {Array.from({ length: PLACEHOLDER_GROUPS }, (_, index) => index).map((index) => (
          <div className="grid gap-3" key={index}>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-10 w-full sm:max-w-md" />
          </div>
        ))}
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    );
  },
);
