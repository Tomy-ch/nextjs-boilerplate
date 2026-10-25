import { withPartSpan } from "@/observability/render-span";

import type { IssueRecipient } from "../../recipient";

/** `IssueRecipientCard` の props。 */
export type IssueRecipientCardProps = {
  /** 発行先の利用者。 */
  recipient: Pick<IssueRecipient, "name" | "email">;
};

/**
 * 発行先の利用者を、選ぶものではなく読むものとして示す。
 *
 * @remarks
 * 操作を持ちません。取り消せない発行の宛先を、内容と同じ面で変えさせないためです。
 *
 * @see Storybook `Features/Admin/Users/CouponNew/RecipientCard`
 */
export const IssueRecipientCard = withPartSpan(
  "features/admin/users/coupon-new/ui/recipient-card/recipient-card",
  ({ recipient }: IssueRecipientCardProps) => {
    return (
      <section className="rounded-lg border p-4">
        <h2 className="font-emphasis text-base">発行先</h2>
        <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[max-content_minmax(0,1fr)]">
          <dt className="text-muted-foreground">氏名</dt>
          <dd className="break-words">{recipient.name}</dd>
          <dt className="text-muted-foreground">メールアドレス</dt>
          <dd className="break-all">{recipient.email}</dd>
        </dl>
        <p className="mt-2 text-muted-foreground text-xs">
          この画面では発行先を変えられません。別の利用者へ発行するときは、利用者一覧から選び直してください。
        </p>
      </section>
    );
  },
);
