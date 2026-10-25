"use client";

import Link from "next/link";

import { FormFeedback } from "@/components/app-starter/form-feedback/form-feedback";
import { Button } from "@/components/design-system/action/button/button";

import { ADMIN_USER_LIST_PATH } from "../../../../paths";
import type { IssueSummaryRow } from "../../issue-summary";

export type IssuedResultProps = {
  recipientName: string;
  summary: readonly IssueSummaryRow[];
  onIssueAnother: () => void;
};

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
