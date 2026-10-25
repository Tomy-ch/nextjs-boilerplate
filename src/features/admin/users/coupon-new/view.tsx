"use client";

import Link from "next/link";
import { useActionState, useCallback, useMemo, useState } from "react";

import { Button } from "@/components/design-system/action/button/button";
import { useSubmissionKey } from "@/components/use-submission-key";
import { idleActionState } from "@/model/action-state";

import type { CouponDiscountField, CouponDiscountValues } from "../../coupon-discount";
import type { CouponScopeValues } from "../../coupon-scope";
import { ADMIN_USER_LIST_PATH } from "../../paths";
import { CouponDiscountFields } from "../../ui/coupon-discount-fields/coupon-discount-fields";
import { CouponScopeFields } from "../../ui/coupon-scope-fields/coupon-scope-fields";
import type { AdminSelectOption } from "../../ui/select-field/select-field";
import { useUnsavedChanges } from "../../ui/unsaved-changes-guard/unsaved-changes-guard";
import { useActionResultFreshness } from "../../use-action-result-freshness";
import { useProductCandidates } from "../../use-product-candidates";
import type { IssueCouponAction, IssueCouponState, IssueOwnField } from "./form-state";
import { closesConfirmation, failuresOf, fieldMessagesOf, recipientLostIn } from "./issue-feedback";
import { confirmationOf, type IssueSummaryRow } from "./issue-summary";
import type { IssueRecipient } from "./recipient";
import { IssueConfirmDialog } from "./ui/confirm-dialog/confirm-dialog";
import { IssuedResult } from "./ui/issued-result/issued-result";
import { IssueRecipientCard } from "./ui/recipient-card/recipient-card";
import { UnavailableRecipient } from "./ui/unavailable-recipient/unavailable-recipient";
import { IssueValidityFields } from "./ui/validity-fields/validity-fields";
import { useIssueValues } from "./use-issue-values";

const LOCKED_MESSAGE =
  "前回の発行の結果が分かるまで、内容は変えられません。同じ内容でもう一度発行してください。";

/** `AdminUserCouponNewView` の props。 */
export type AdminUserCouponNewViewProps = {
  /** URL が名指しした受給者。画面では変えられない。 */
  recipient: IssueRecipient;
  /** 範囲に選べるカテゴリ。 */
  categoryOptions: readonly AdminSelectOption[];
  /** 発行を送る Server Action。 */
  issueAction: IssueCouponAction;
};

type IssueCouponFormProps = Omit<AdminUserCouponNewViewProps, "recipient"> & {
  recipient: Pick<IssueRecipient, "id" | "name">;
};

/**
 * 発行のフォーム。送信の状態・冪等キー・打たれている値を持つ。
 *
 * @remarks
 * **冪等キーは開いたときに作り、結果が定まらないあいだは同じキーで同じ内容を送り直させます。**
 * 409 は同じキーの要求が処理中と読み、キーと内容を保ちます。成功のあとは入力を空へ戻し、
 * 報せの面に替えます。続けて押した 2 枚目が、気付かれずに同じ内容で発行されるのを避けるためです。
 *
 * @param props - 受給者・カテゴリ・Server Action
 */
function IssueCouponForm({ categoryOptions, issueAction, recipient }: IssueCouponFormProps) {
  const [state, formAction] = useActionState<IssueCouponState, FormData>(
    issueAction,
    idleActionState(),
  );
  const { idempotencyKey, outcomeOpen } = useSubmissionKey(state, { conflict: "in-progress" });
  const [confirming, setConfirming] = useState(false);
  const [productKeyword, setProductKeyword] = useState("");
  const [sentSummary, setSentSummary] = useState<readonly IssueSummaryRow[]>([]);
  const [issuedSummary, setIssuedSummary] = useState<readonly IssueSummaryRow[] | null>(null);
  const values = useIssueValues();
  const productCandidates = useProductCandidates(productKeyword);
  const { dismiss, dismissed, resultIsNew } = useActionResultFreshness(state);

  const recipientLost = recipientLostIn(state);

  useUnsavedChanges(values.dirty && !recipientLost);

  if (resultIsNew && closesConfirmation(state)) {
    setConfirming(false);
  }

  if (resultIsNew && state.status === "success") {
    setIssuedSummary(sentSummary);
    values.reset();
  }

  const { own, setDiscount, setOwn, setScope, touch, touchAll } = values;

  const changeOwn = useCallback(
    (field: IssueOwnField, value: string) => {
      setOwn(field, value);
      dismiss();
    },
    [dismiss, setOwn],
  );
  const changeDiscount = useCallback(
    (next: CouponDiscountValues) => {
      setDiscount(next);
      dismiss();
    },
    [dismiss, setDiscount],
  );
  const leaveDiscount = useCallback((field: CouponDiscountField) => touch(field), [touch]);
  const changeScope = useCallback(
    (next: CouponScopeValues) => {
      setScope(next);
      dismiss();
    },
    [dismiss, setScope],
  );

  const openConfirmation = useCallback(() => {
    if (touchAll()) {
      dismiss();
      setConfirming(true);
    }
  }, [dismiss, touchAll]);

  const closeConfirmation = useCallback(() => setConfirming(false), []);
  const issueAnother = useCallback(() => setIssuedSummary(null), []);

  const categoryName =
    categoryOptions.find((option) => option.value === values.scope.categoryId)?.label ?? "";
  const confirmation = useMemo(
    () => confirmationOf(own, values.discount, values.scope, categoryName),
    [categoryName, own, values.discount, values.scope],
  );

  const submit = useCallback(
    (formData: FormData) => {
      setSentSummary(confirmation.summary);
      formAction(formData);
    },
    [confirmation.summary, formAction],
  );

  if (recipientLost) {
    return <UnavailableRecipient reason="lost" />;
  }

  if (issuedSummary !== null) {
    return (
      <IssuedResult
        onIssueAnother={issueAnother}
        recipientName={recipient.name}
        summary={issuedSummary}
      />
    );
  }

  const shown = dismissed ? null : state;
  const messages = fieldMessagesOf(values.errors, shown);

  return (
    <div className="grid gap-8">
      {outcomeOpen ? <p className="text-muted-foreground text-sm">{LOCKED_MESSAGE}</p> : null}
      <fieldset className="grid gap-8" disabled={outcomeOpen}>
        <CouponDiscountFields
          messages={messages}
          onLeave={leaveDiscount}
          onValuesChange={changeDiscount}
          values={values.discount}
        />
        <CouponScopeFields
          categoryOptions={categoryOptions}
          messages={messages}
          onProductSearchChange={setProductKeyword}
          onValuesChange={changeScope}
          productCandidates={productCandidates}
          values={values.scope}
        />
        <IssueValidityFields
          messages={messages}
          onLeave={touch}
          onValueChange={changeOwn}
          values={own}
        />
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={openConfirmation} type="button">
          内容を確認する
        </Button>
        <Button asChild variant="ghost">
          <Link href={ADMIN_USER_LIST_PATH}>キャンセル</Link>
        </Button>
      </div>
      <IssueConfirmDialog
        confirmation={confirmation}
        failures={shown === null ? [] : failuresOf(shown)}
        formAction={submit}
        idempotencyKey={idempotencyKey}
        onDismiss={closeConfirmation}
        open={confirming}
        recipient={recipient}
      />
    </div>
  );
}

/**
 * 利用者 1 人にクーポンを発行する画面の、唯一の Client Island。
 *
 * @remarks
 * 受給者は表示だけで、選ばせません。退会済みの受給者にはフォームを出しません。
 *
 * @param props - {@link AdminUserCouponNewViewProps} を参照。
 * @see Storybook `Page/Admin/Users/CouponNew`
 */
export function AdminUserCouponNewView({
  categoryOptions,
  issueAction,
  recipient,
}: AdminUserCouponNewViewProps) {
  return (
    <div className="grid gap-8">
      <IssueRecipientCard recipient={recipient} />
      {recipient.withdrawn ? (
        <UnavailableRecipient reason="withdrawn" />
      ) : (
        <IssueCouponForm
          categoryOptions={categoryOptions}
          issueAction={issueAction}
          recipient={recipient}
        />
      )}
    </div>
  );
}
