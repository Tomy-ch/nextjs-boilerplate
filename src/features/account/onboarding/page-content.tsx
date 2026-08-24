import { getPrefectures } from "@/adapters/server/api/prefectures";
import { newIdempotencyKey } from "@/model/idempotency-key";
import type { SafeReturnUrl } from "@/model/return-url";
import { withRenderSpan } from "@/observability/render-span";
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
 * 冪等キーをここで作ります。画面を組み立てるたびに 1 つ作るため、同じ画面から二重に送っても
 * 登録は 1 件のままです。逆に開き直せば別の鍵になりますが、そのときは登録が済んでいれば
 * この画面には入れません（`requireUnregisteredUser`）。
 */
export const OnboardingPageContent = withRenderSpan(
  "features/account/onboarding/page-content",
  async ({ returnUrl }: OnboardingPageContentProps) => {
    return (
      <OnboardingView
        idempotencyKey={newIdempotencyKey()}
        prefectures={await getPrefectures()}
        returnUrl={returnUrl}
      />
    );
  },
);
