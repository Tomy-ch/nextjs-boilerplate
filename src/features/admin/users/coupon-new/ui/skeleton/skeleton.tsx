import { Skeleton } from "@/components/design-system/status/skeleton/skeleton";
import { LoadingAnnouncement } from "@/components/shell/loading-announcer/loading-announcer";
import { withPartSpan } from "@/observability/render-span";

const PLACEHOLDER_GROUPS = 3;

export const AdminUserCouponNewSkeleton = withPartSpan(
  "features/admin/users/coupon-new/ui/skeleton/skeleton",
  () => {
    return (
      <div aria-hidden="true" className="grid gap-8">
        <LoadingAnnouncement />
        <div className="grid gap-2 rounded-lg border p-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
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
