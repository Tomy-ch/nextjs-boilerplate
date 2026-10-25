import { AdminUserCouponNewBreadcrumbContent } from "@/features/admin/users/coupon-new/breadcrumb-content";
import { toUserId } from "@/model/user/user";

export default async function AdminUserCouponNewBreadcrumb({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <AdminUserCouponNewBreadcrumbContent id={toUserId(id)} />;
}
