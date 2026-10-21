import type { Metadata } from "next";
import { Suspense } from "react";

import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { getClockConfig } from "@/config/clock/clock.server";
import { requireRegisteredUser } from "@/features/account/registration-gate";
import { COUPONS_PATH } from "@/features/coupons/facade/paths/paths";
import { WalletPageContent } from "@/features/coupons/wallet/page-content";
import { WalletSkeleton } from "@/features/coupons/wallet/ui/skeleton/skeleton";

export const metadata: Metadata = {
  title: "クーポン",
  description: "受け取ったクーポンと、その状態を確認できます。",
  robots: { index: false, follow: false },
};

/**
 * 保有クーポンの中身。
 *
 * @remarks
 * **登録済みかの判定と「いま」を読むのは穴の内側です。** 器の側で待つと、待っている間は殻すら
 * 配れません。実時計はプリレンダーの最中には値が定まらないため、要求ごとの値（登録の判定が読む
 * cookie）を待った後に読みます。順序を入れ替えると、プリレンダーの最中に実時計を読みます。
 *
 * **「いま」をここで読んで渡します。** 状態の判定に使う時刻を `features` の中で読むと、検証で
 * 固定できません（`config/clock`）。
 */
async function WalletContent() {
  await requireRegisteredUser(COUPONS_PATH);

  return <WalletPageContent now={getClockConfig().now()} />;
}

/**
 * 保有クーポンの一覧と、キャンペーンコードでの受け取り。
 *
 * @remarks
 * マイページとは独立したルートです。受け取りの結果は一覧が 1 枚増えることでしか確かめられない
 * ため、一覧と受け取り欄を同じ画面に置きます。
 */
export default function CouponsPage() {
  return (
    <ContentContainer className="py-8">
      <PageHeader>
        <div>
          <PageHeaderTitle>クーポン</PageHeaderTitle>
          <PageHeaderDescription>
            受け取ったクーポンと、その状態を確認できます。
          </PageHeaderDescription>
        </div>
      </PageHeader>
      <Suspense fallback={<WalletSkeleton />}>
        <WalletContent />
      </Suspense>
    </ContentContainer>
  );
}
