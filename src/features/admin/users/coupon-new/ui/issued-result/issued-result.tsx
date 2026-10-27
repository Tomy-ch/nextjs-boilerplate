"use client";

import Link from "next/link";

import { FormFeedback } from "@/components/app-starter/form-feedback/form-feedback";
import { Button } from "@/components/design-system/action/button/button";

import { ADMIN_USER_LIST_PATH } from "../../../../paths";
import type { IssueSummaryRow } from "../../issue-summary";

/** `IssuedResult` の props。 */
export type IssuedResultProps = {
  /** 発行した相手の姓名。 */
  recipientName: string;
  /** 送ったときの復唱。発行後に空へ戻した入力からは作らない。 */
  summary: readonly IssueSummaryRow[];
  /** 続けて発行する操作が選ばれたことを伝える。 */
  onIssueAnother: () => void;
};

/**
 * 発行が成立したことの報せ。確認が閉じても残る場所に出す。
 *
 * @remarks
 * 契約に発行を読み戻す口が無いため、報せは読み込み直すと消えます。そのことも本文で述べます。
 *
 * @param props - {@link IssuedResultProps} を参照。
 * @see Storybook `Features/Admin/Users/CouponNew/IssuedResult`
 */
export function IssuedResult({ onIssueAnother, recipientName, summary }: IssuedResultProps) {
  return (
    <div className="grid gap-4">
      <FormFeedback title={`${recipientName} さんにクーポンを 1 枚発行しました`}>
        <dl className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-[max-content_minmax(0,1fr)]">
          {summary.map(({ detail, term }) => (
            <div className="contents" key={term}>
              <dt className="text-muted-foreground">{term}</dt>
              <dd className="break-words">{detail}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-xs">
          この報せは画面を読み込み直すと消えます。発行したクーポンは取り消せません。
        </p>
      </FormFeedback>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onIssueAnother} type="button" variant="outline">
          続けて発行する
        </Button>
        <Button asChild variant="ghost">
          <Link href={ADMIN_USER_LIST_PATH}>利用者一覧へ戻る</Link>
        </Button>
      </div>
    </div>
  );
}
