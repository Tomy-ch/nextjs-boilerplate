import { getMyCoupons } from "@/adapters/server/api/coupons";
import { withScreenSpan } from "@/observability/render-span";

import { WalletView } from "./view";

/** `WalletPageContent` の props。 */
export type WalletPageContentProps = {
  /** 状態を決める時刻。実時計を読むのは `app` の役目で、ここは受け取るだけにする。 */
  readonly now: Date;
};

/**
 * 保有クーポンを取得して、器へ渡す。
 *
 * @remarks
 * 取得の失敗は握りつぶさずに投げ、route の境界に任せます。一覧はこの画面の本体で、欠けたまま
 * 受け取り欄だけを出しても、受け取った結果を確かめる場所がありません。
 *
 * @param props - 受け取る内容。個々の意味は {@link WalletPageContentProps} の各メンバーが持つ。
 */
export const WalletPageContent = withScreenSpan(
  "features/coupons/wallet/page-content",
  async ({ now }: WalletPageContentProps) => {
    const coupons = await getMyCoupons();

    return <WalletView coupons={coupons} now={now} />;
  },
);
