"use client";

import Link from "next/link";
import { useActionState, useCallback, useId, useMemo, useState } from "react";

import { Button } from "@/components/design-system/action/button/button";
import { useSubmissionKey } from "@/components/use-submission-key";
import { idleActionState } from "@/model/action-state";

import type { CouponDiscountField, CouponDiscountValues } from "../../coupon-discount";
import type { CouponScopeValues } from "../../coupon-scope";
import { ADMIN_CAMPAIGN_LIST_PATH } from "../../paths";
import { CouponDiscountFields } from "../../ui/coupon-discount-fields/coupon-discount-fields";
import { CouponScopeFields } from "../../ui/coupon-scope-fields/coupon-scope-fields";
import type { AdminSelectOption } from "../../ui/select-field/select-field";
import { AdminTextField } from "../../ui/text-field/text-field";
import { useUnsavedChanges } from "../../ui/unsaved-changes-guard/unsaved-changes-guard";
import { useActionResultFreshness } from "../../use-action-result-freshness";
import { useProductCandidates } from "../../use-product-candidates";
import { closesConfirmation, failuresOf, fieldMessagesOf } from "./campaign-feedback";
import { confirmationOf } from "./campaign-summary";
import { CAMPAIGN_FORM_NAMES } from "./form-names";
import {
  CAMPAIGN_FIELD_LABELS,
  type CampaignOwnField,
  type CreateCampaignAction,
  type CreateCampaignState,
} from "./form-state";
import { CampaignConfirmDialog } from "./ui/confirm-dialog/confirm-dialog";
import { CampaignLimitFields } from "./ui/limit-fields/limit-fields";
import { CampaignPeriodFields } from "./ui/period-fields/period-fields";
import { useCampaignValues } from "./use-campaign-values";

const LOCKED_MESSAGE =
  "前回の定義の結果が分かるまで、内容は変えられません。同じ内容でもう一度定義してください。";

/** `AdminCampaignCreateView` の props。 */
export type AdminCampaignCreateViewProps = {
  /** 範囲として選べるカテゴリ。 */
  categoryOptions: readonly AdminSelectOption[];
  /** 定義の送信先。 */
  createAction: CreateCampaignAction;
};

/**
 * キャンペーンを定義する画面の、唯一の client island。
 *
 * @remarks
 * **送信の状態・冪等キー・打っている値をここだけが持ちます。** 確認の面は送るときにここの値を
 * 載せ直し、弾かれたときは結果がここへ返ります。
 *
 * **冪等キーは mount したときに作り、送信の結果が定まるまで持ち続けます。** server で作ると、
 * 成立して一覧へ移った後の戻る操作で、送り終えたキーのまま画面が作り直されます。結果が定まらない
 * 失敗の後は欄を止め、同じ内容の再送だけを受け付けます。別の内容を同じキーで送ると、接続先が
 * 拒むためです。
 *
 * 画面が何を約束するかは
 * [機能要件](../../../../../docs/spec/route/admin/campaigns/new/page.function.md)と[画面要件](../../../../../docs/spec/route/admin/campaigns/new/page.screen.md)。
 *
 * @see Storybook `Page/Admin/Campaigns/New`
 */
export function AdminCampaignCreateView({
  categoryOptions,
  createAction,
}: AdminCampaignCreateViewProps) {
  const idPrefix = useId();
  const [state, formAction] = useActionState<CreateCampaignState, FormData>(
    createAction,
    idleActionState(),
  );
  const { idempotencyKey, outcomeOpen } = useSubmissionKey(state);
  const [confirming, setConfirming] = useState(false);
  const [productKeyword, setProductKeyword] = useState("");
  const values = useCampaignValues();
  const productCandidates = useProductCandidates(productKeyword);
  const { dismiss, dismissed, resultIsNew } = useActionResultFreshness(state);

  useUnsavedChanges(values.dirty);

  // 結果が返った描画の中で閉じる。effect にすると、閉じる前の描画が一度挟まり、欄に誤りが
  // 出ているのに確認が開いたまま見える。
  if (resultIsNew && closesConfirmation(state)) {
    setConfirming(false);
  }

  const { own, setDiscount, setOwn, setScope, touch, touchAll } = values;

  const changeOwn = useCallback(
    (field: CampaignOwnField, value: string) => {
      setOwn(field, value);
      dismiss();
    },
    [dismiss, setOwn],
  );
  const changeCode = useCallback((value: string) => changeOwn("code", value), [changeOwn]);
  const leaveCode = useCallback(() => touch("code"), [touch]);
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

  const shown = dismissed ? null : state;
  const messages = fieldMessagesOf(values.errors, shown);
  const categoryName =
    categoryOptions.find((option) => option.value === values.scope.categoryId)?.label ?? "";
  const confirmation = useMemo(
    () => confirmationOf(own, values.discount, values.scope, categoryName),
    [categoryName, own, values.discount, values.scope],
  );

  return (
    <div className="grid gap-8">
      {outcomeOpen ? <p className="text-muted-foreground text-sm">{LOCKED_MESSAGE}</p> : null}
      <fieldset className="grid gap-8" disabled={outcomeOpen}>
        <div className="sm:max-w-md">
          <AdminTextField
            controlId={`${idPrefix}code`}
            description="利用者が受け取るときに打つコードです。前後の空白を除き、大文字に揃えて保存します。"
            label={CAMPAIGN_FIELD_LABELS.code}
            name={CAMPAIGN_FORM_NAMES.code}
            onLeave={leaveCode}
            onValueChange={changeCode}
            required={true}
            type="text"
            value={own.code}
            {...(messages.code === undefined ? {} : { message: messages.code })}
          />
        </div>
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
        <CampaignPeriodFields
          messages={messages}
          onLeave={touch}
          onValueChange={changeOwn}
          values={own}
        />
        <CampaignLimitFields
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
          <Link href={ADMIN_CAMPAIGN_LIST_PATH}>キャンセル</Link>
        </Button>
      </div>
      <CampaignConfirmDialog
        confirmation={confirmation}
        failures={shown === null ? [] : failuresOf(shown)}
        formAction={formAction}
        idempotencyKey={idempotencyKey}
        onDismiss={closeConfirmation}
        open={confirming}
      />
    </div>
  );
}
