import Link from "next/link";

import { FormFeedback } from "@/components/app-starter/form-feedback/form-feedback";
import { Button } from "@/components/design-system/action/button/button";
import { withPartSpan } from "@/observability/render-span";

import { ADMIN_USER_LIST_PATH } from "../../../../paths";
import { ISSUE_RECIPIENT_LOST_MESSAGE } from "../../form-state";

/** `UnavailableRecipient` の props。 */
export type UnavailableRecipientProps = {
  /** 開いた時点で退会済みだったか（`withdrawn`）、送った時点で失ったか（`lost`）。 */
  reason: "withdrawn" | "lost";
};

/**
 * 発行できない受給者のときに、フォームの代わりに出す面。一覧へ戻る導線だけを持つ。
 *
 * @remarks
 * 押しても何も起きない欄を残さないため、フォームは止めずに差し替えます。
 *
 * @see Storybook `Features/Admin/Users/CouponNew/UnavailableRecipient`
 */
export const UnavailableRecipient = withPartSpan(
  "features/admin/users/coupon-new/ui/unavailable-recipient/unavailable-recipient",
  ({ reason }: UnavailableRecipientProps) => {
    return (
      <div className="grid gap-4">
        {reason === "withdrawn" ? (
          <section className="rounded-lg border p-4">
            <h2 className="font-emphasis text-base">退会済みの利用者です</h2>
            <p className="mt-1 text-sm">退会した利用者にはクーポンを発行できません。</p>
          </section>
        ) : (
          <FormFeedback
            description={ISSUE_RECIPIENT_LOST_MESSAGE}
            title="発行できませんでした"
            variant="destructive"
          />
        )}
        <div>
          <Button asChild variant="outline">
            <Link href={ADMIN_USER_LIST_PATH}>利用者一覧へ戻る</Link>
          </Button>
        </div>
      </div>
    );
  },
);
