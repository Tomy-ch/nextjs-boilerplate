import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/design-system/navigation/breadcrumb/breadcrumb";
import { MYPAGE_PATH } from "@/features/account/facade/paths/paths";
import type { HeldCoupon } from "@/model/coupon/coupon";
import { withScreenSpan } from "@/observability/render-span";

import { ClaimForm } from "./ui/claim-form/claim-form";
import { CouponList } from "./ui/coupon-list/coupon-list";

/** `WalletView` の props。 */
export type WalletViewProps = {
  /** 保有クーポン。応答の順序のまま。 */
  readonly coupons: readonly HeldCoupon[];
  /** 状態を決める時刻。 */
  readonly now: Date;
};

/**
 * 受け取り欄を上に、保有一覧を下に置く保有クーポンの器。
 *
 * @remarks
 * 受け取りが成立すると一覧が 1 行増えます。欄を一覧の下に置くと、増えるたびに欄の位置が
 * 動きます。
 *
 * global nav から 1 手で戻れない階層にあるため、パンくずで祖先への戻りを持ちます。
 *
 * @param props - 受け取る内容。個々の意味は {@link WalletViewProps} の各メンバーが持つ。
 */
export const WalletView = withScreenSpan(
  "features/coupons/wallet/view",
  ({ coupons, now }: WalletViewProps) => {
    return (
      <div className="flex flex-col gap-8">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href={MYPAGE_PATH}>マイページ</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>クーポン</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <ClaimForm />
        <CouponList coupons={coupons} now={now} />
      </div>
    );
  },
);
