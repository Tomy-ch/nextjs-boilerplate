import { Alert, AlertDescription, AlertTitle } from "@/components/design-system/status/alert/alert";
import { withPartSpan } from "@/observability/render-span";
import type { SuspendCampaignState } from "../../form-state";

/** `SuspendFeedback` の props。 */
export type SuspendFeedbackProps = {
  /** 直前の停止の結果。 */
  state: SuspendCampaignState;
};

/**
 * 配布を停止した結果の報せ。
 *
 * @remarks
 * **一覧の上に 1 つだけ置きます。** 確認の面は結果が返ると閉じるので、その中に出した文言は一緒に
 * 消えます。行ごとに置くと、どれが最新の結果かが判りません。
 *
 * 成立の報せに、配ったクーポンは無効にならないことを添えます。確認で読んだことを、成立した後にも
 * 同じ言葉で残します。
 *
 * @param props - {@link SuspendFeedbackProps} を参照。
 * @see Storybook `Features/Admin/Campaigns/List/SuspendFeedback`
 */
export const SuspendFeedback = withPartSpan(
  "features/admin/campaigns/list/ui/suspend-feedback/suspend-feedback",
  ({ state }: SuspendFeedbackProps) => {
    if (state.status === "success") {
      return (
        <Alert>
          <AlertTitle className="break-all">{state.value.code} の配布を停止しました</AlertTitle>
          <AlertDescription>
            すでに配ったクーポンは無効にならず、受け取った人はそのまま使えます。
          </AlertDescription>
        </Alert>
      );
    }

    if (state.status === "error" && state.formError !== null) {
      return (
        <Alert variant="destructive">
          <AlertTitle>配布を停止できませんでした</AlertTitle>
          <AlertDescription className="break-all">{state.formError}</AlertDescription>
        </Alert>
      );
    }

    return null;
  },
);
