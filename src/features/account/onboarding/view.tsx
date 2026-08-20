"use client";

import { useActionState } from "react";

import { FormFeedback } from "@/components/app-starter/form-feedback/form-feedback";
import type { WizardSteps } from "@/components/patterns/wizard-form/wizard-form";
import { WizardForm } from "@/components/patterns/wizard-form/wizard-form";
import { idleActionState } from "@/model/action-state";
import { IDEMPOTENCY_KEY_FIELD } from "@/model/idempotency-key";
import type { SafeReturnUrl } from "@/model/return-url";
import type { Prefecture } from "@/model/user/user";

import { registerAction } from "../actions";
import type { ProfileFormState } from "../form-state";
import { ProfileSubmitButton } from "../ui/submit-button/submit-button";
import { useProfileFields } from "../use-profile-fields";
import { RETURN_URL_FIELD } from "./parse-registration-form";
import { RegistrationAddressSection } from "./ui/address-section/address-section";
import { RegistrationBasicsSection } from "./ui/basics-section/basics-section";
import { RegistrationConfirmSection } from "./ui/confirm-section/confirm-section";

const SUBMIT_LABEL = "登録する";
const PENDING_LABEL = "登録しています…";

/** {@link OnboardingView} の props。 */
export type OnboardingViewProps = {
  /** 選べる都道府県。 */
  readonly prefectures: readonly Prefecture[];
  /** この登録 1 回ぶんを指す鍵。画面を組み立てた地点が作る。 */
  readonly idempotencyKey: string;
  /** 登録を終えた利用者を戻す先。 */
  readonly returnUrl: SafeReturnUrl;
};

/**
 * 登録（オンボーディング）の画面。
 *
 * @remarks
 * **段に分けて進みます。** 初めての入力では一度に 9 項目を見せる理由が無く、進捗と行き来だけを
 * `WizardForm` が持ちます。**表示していない段も DOM に残る**ため、送信は最後の段で 1 回、
 * 全項目を載せて行われます（[0061](../../../../docs/adr/0061-form-mutation-ux.md)）。
 *
 * 検証といつ誤りを見せるかは `useProfileFields`、住所の補完は住所の段が持ちます。どちらも
 * プロフィール編集と同じもので、**登録と編集で規則が割れないのはこれを共有している**からです。
 *
 * **進む操作を塞ぎません。** 未入力のまま先へ進めますが、最後の段が足りない項目を名指しします。
 * 塞ぐ側に倒すと、何が足りないのか言わないまま押せない button が残ります
 * （[0062](../../../../docs/adr/0062-form-input-validation.md)）。
 *
 * パンくずを置きません。この画面に着いた利用者はまだどの画面にも入れず、戻れる祖先がありません
 * （[0026](../../../../docs/adr/0026-layout-shell-mount.md)）。
 */
export function OnboardingView({ idempotencyKey, prefectures, returnUrl }: OnboardingViewProps) {
  const [state, formAction] = useActionState<ProfileFormState, FormData>(
    registerAction,
    idleActionState(),
  );
  const fields = useProfileFields(null, state);

  const steps: WizardSteps = [
    {
      id: "basics",
      title: "基本情報",
      content: <RegistrationBasicsSection fields={fields} />,
    },
    {
      id: "address",
      title: "住所",
      content: <RegistrationAddressSection fields={fields} prefectures={prefectures} />,
      nextLabel: "確認へ進む",
    },
    {
      id: "confirm",
      title: "確認",
      content: <RegistrationConfirmSection control={fields.control} />,
    },
  ];

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-8">
      <input name={IDEMPOTENCY_KEY_FIELD} type="hidden" value={idempotencyKey} />
      <input name={RETURN_URL_FIELD} type="hidden" value={returnUrl} />

      {state.status === "error" && state.formError !== null ? (
        <FormFeedback
          description={state.formError}
          title="登録できませんでした"
          variant="destructive"
        />
      ) : null}

      <WizardForm
        label="登録"
        steps={steps}
        submit={<ProfileSubmitButton label={SUBMIT_LABEL} pendingLabel={PENDING_LABEL} />}
      />
    </form>
  );
}
