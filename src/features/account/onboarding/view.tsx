"use client";

import { useActionState, useState } from "react";
import { useWatch } from "react-hook-form";

import { FormFeedback } from "@/components/app-starter/form-feedback/form-feedback";
import type { WizardSteps } from "@/components/patterns/wizard-form/wizard-form";
import { WizardForm } from "@/components/patterns/wizard-form/wizard-form";
import { idleActionState } from "@/model/action-state";
import {
  IDEMPOTENCY_KEY_FIELD,
  leavesOutcomeOpen,
  newIdempotencyKey,
  settlesSubmission,
} from "@/model/idempotency-key";
import type { SafeReturnUrl } from "@/model/return-url";
import type { Prefecture } from "@/model/user/user";

import { registerAction } from "../actions";
import type { ProfileFormState } from "../form-state";
import { ProfileSubmitButton } from "../ui/submit-button/submit-button";
import { useProfileFields } from "../use-profile-fields";
import { RETURN_URL_FIELD } from "./form-names";
import { ADDRESS_FIELDS, BASICS_FIELDS, isStepComplete, STEP_IDS } from "./steps";
import { RegistrationAddressSection } from "./ui/address-section/address-section";
import { RegistrationBasicsSection } from "./ui/basics-section/basics-section";
import { RegistrationConfirmSection } from "./ui/confirm-section/confirm-section";

const SUBMIT_LABEL = "登録する";
const PENDING_LABEL = "登録しています…";
const LOCKED_MESSAGE =
  "前回の登録の結果が分かるまで、内容は変えられません。同じ内容でもう一度登録してください。";

/** {@link OnboardingView} の props。 */
export type OnboardingViewProps = {
  /** 選べる都道府県。 */
  readonly prefectures: readonly Prefecture[];
  /** 最初の送信に載せる鍵。画面を組み立てた地点が作る。 */
  readonly idempotencyKey: string;
  /** 登録を終えた利用者を戻す先。 */
  readonly returnUrl: SafeReturnUrl;
};

/**
 * 9 項目を段に分けて進め、送信は最後の段で 1 回だけ行う登録の器。
 *
 * @remarks
 * 初めての入力では一度に全項目を見せる理由が無く、進捗と行き来だけを `WizardForm` が持ちます。
 * **表示していない段も DOM に残る**ため、送信には全項目が載ります。
 *
 * 検証といつ誤りを見せるかは `useProfileFields`、住所の補完は住所の段が持ちます。
 *
 * **今の段が埋まるまで次へは進めません**（`blocked`）。誤りの文言を出す条件はこれとは別で、触れた
 * 項目からだけ出します。
 *
 * 鍵は最初に受け取ったものを使い、応答が送信を確定させたら作り直します。結果が定まらないあいだは
 * 段を動けなくし、送った内容のまま送り直させます（理由は `model/idempotency-key.ts`）。
 *
 * パンくずを置きません。この画面に着いた利用者はまだどの画面にも入れず、戻れる祖先がありません。
 *
 * @param props - 選べる都道府県、この登録を指す鍵、登録を終えた利用者を戻す先。
 */
export function OnboardingView({
  idempotencyKey: initialIdempotencyKey,
  prefectures,
  returnUrl,
}: OnboardingViewProps) {
  const [idempotencyKey, setIdempotencyKey] = useState(initialIdempotencyKey);
  const [state, formAction] = useActionState<ProfileFormState, FormData>(
    registerAction,
    idleActionState(),
  );
  const [seenState, setSeenState] = useState(state);

  if (seenState !== state) {
    setSeenState(state);

    if (settlesSubmission(state)) {
      setIdempotencyKey(newIdempotencyKey());
    }
  }

  const outcomeOpen = leavesOutcomeOpen(state);
  const fields = useProfileFields(null, state);
  const values = useWatch({ control: fields.control });

  const steps: WizardSteps = [
    {
      id: STEP_IDS[0],
      title: "基本情報",
      content: <RegistrationBasicsSection fields={fields} />,
      blocked: !isStepComplete(values, BASICS_FIELDS),
    },
    {
      id: STEP_IDS[1],
      title: "住所",
      content: <RegistrationAddressSection fields={fields} prefectures={prefectures} />,
      blocked: !isStepComplete(values, ADDRESS_FIELDS),
      nextLabel: "確認へ進む",
    },
    {
      id: STEP_IDS[2],
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

      {outcomeOpen ? <p className="text-muted-foreground text-sm">{LOCKED_MESSAGE}</p> : null}

      <WizardForm
        label="登録"
        locked={outcomeOpen}
        steps={steps}
        submit={<ProfileSubmitButton label={SUBMIT_LABEL} pendingLabel={PENDING_LABEL} />}
      />
    </form>
  );
}
