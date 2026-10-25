import { getPrefectures } from "@/adapters/server/api/prefectures";
import type { SafeReturnUrl } from "@/model/return-url";
import { withScreenSpan } from "@/observability/render-span";
import { OnboardingView } from "./view";

type OnboardingPageContentProps = {
  /** 登録を終えた利用者を戻す先。 */
  readonly returnUrl: SafeReturnUrl;
};

/**
 * 登録の取得と組み立て。
 *
 * @remarks
 * 取るのは都道府県のマスタだけです。**まだ利用者の記録が無い**ので、埋めておける値がありません。
 *
 * @param props - 登録を終えた利用者を戻す先。
 */
export const OnboardingPageContent = withScreenSpan(
  "features/account/onboarding/page-content",
  async ({ returnUrl }: OnboardingPageContentProps) => {
    return <OnboardingView prefectures={await getPrefectures()} returnUrl={returnUrl} />;
  },
);
