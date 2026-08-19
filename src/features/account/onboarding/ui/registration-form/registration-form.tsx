"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { FormFeedback } from "@/components/app-starter/form-feedback/form-feedback";
import { Button } from "@/components/design-system/action/button/button";
import { FieldGroup } from "@/components/design-system/form/field/field";
import type { WizardSteps } from "@/components/patterns/wizard-form/wizard-form";
import { WizardForm } from "@/components/patterns/wizard-form/wizard-form";
import { idleActionState } from "@/model/action-state";
import { IDEMPOTENCY_KEY_FIELD } from "@/model/idempotency-key";
import type { SafeReturnUrl } from "@/model/return-url";
import type { Prefecture } from "@/model/user/user";

import { registerAction } from "../../../actions";
import { PROFILE_FIELD_LABELS } from "../../../field-labels";
import type { ProfileFormState } from "../../../form-state";
import { PostalCodeField } from "../../../ui/postal-code-field/postal-code-field";
import { PrefectureField } from "../../../ui/prefecture-field/prefecture-field";
import { TextField } from "../../../ui/text-field/text-field";
import { useAddressField } from "../../../use-address-field";
import { useProfileFields } from "../../../use-profile-fields";
import { RETURN_URL_FIELD } from "../../parse-registration-form";
import { RegistrationSummary } from "../registration-summary/registration-summary";

const SUBMIT_LABEL = "登録する";
const PENDING_LABEL = "登録しています…";

/** 送信ボタン。押している間の表示を持つため、`form` の子として切り出している。 */
function SubmitButton() {
  const { pending } = useFormStatus();
  const label = pending ? PENDING_LABEL : SUBMIT_LABEL;

  return (
    <Button disabled={pending} type="submit">
      {label}
    </Button>
  );
}

type RegistrationFormProps = {
  readonly prefectures: readonly Prefecture[];
  /** この登録 1 回ぶんを指す鍵。画面を組み立てた地点が作る。 */
  readonly idempotencyKey: string;
  /** 登録を終えた利用者を戻す先。 */
  readonly returnUrl: SafeReturnUrl;
};

/**
 * 登録フォーム。段階に分けて入力を受け、最後に一度だけ送る。
 *
 * @remarks
 * 段階の器は `WizardForm` が持ちます。**表示していない段階も DOM に残る**ため、送信は最後の
 * 段階で 1 回、9 項目すべてを載せて行われます（[0061](../../../../../../docs/adr/0061-form-mutation-ux.md)）。
 *
 * 検証といつ誤りを見せるかは `useProfileFields`、住所の補完は `useAddressField` が持ちます。
 * どちらもプロフィール編集と同じもので、**登録と編集で規則が割れないのはこれを共有している**
 * からです。
 *
 * **進む操作を塞ぎません。** 未入力のまま先へ進めますが、最後の段階が足りない項目を名指しで
 * 挙げます。塞ぐ側に倒すと、何が足りないのか言わないまま押せない button が残ります
 * （[0062](../../../../../../docs/adr/0062-form-input-validation.md)）。
 */
export function RegistrationForm({
  idempotencyKey,
  prefectures,
  returnUrl,
}: RegistrationFormProps) {
  const [state, formAction] = useActionState<ProfileFormState, FormData>(
    registerAction,
    idleActionState(),
  );
  const fields = useProfileFields(null, state);
  const address = useAddressField(fields);
  const postalCode = fields.fieldOf("postalCode");

  const steps: WizardSteps = [
    {
      id: "profile",
      title: "基本情報",
      content: (
        <FieldGroup>
          <div className="grid gap-6 sm:grid-cols-2">
            <TextField
              autoComplete="family-name"
              label={PROFILE_FIELD_LABELS.lastName}
              {...fields.fieldOf("lastName")}
            />
            <TextField
              autoComplete="given-name"
              label={PROFILE_FIELD_LABELS.firstName}
              {...fields.fieldOf("firstName")}
            />
          </div>
          <TextField
            autoComplete="email"
            label={PROFILE_FIELD_LABELS.email}
            type="email"
            {...fields.fieldOf("email")}
          />
          <TextField
            autoComplete="tel"
            inputMode="tel"
            label={PROFILE_FIELD_LABELS.phone}
            type="tel"
            {...fields.fieldOf("phone")}
          />
        </FieldGroup>
      ),
    },
    {
      id: "address",
      title: "住所",
      content: (
        <FieldGroup>
          {/* 補完は focus が外れた時点で走る。起きたことを画面の変化だけで伝えると、
              入力欄を見ていない利用者には届かない。 */}
          <p className="text-sm text-muted-foreground" role="status">
            {address.message}
          </p>
          <PostalCodeField
            controlId={postalCode.controlId}
            errorId={postalCode.errorId}
            message={postalCode.message}
            onSearch={address.onSearch}
            registration={address.registration}
            required={postalCode.required}
            searching={address.searching}
            unavailable={address.unavailable}
          />
          <PrefectureField prefectures={prefectures} {...fields.fieldOf("prefecture")} />
          <TextField
            autoComplete="address-level2"
            label={PROFILE_FIELD_LABELS.city}
            {...fields.fieldOf("city")}
          />
          <TextField
            autoComplete="address-line1"
            label={PROFILE_FIELD_LABELS.street}
            {...fields.fieldOf("street")}
          />
          <TextField
            autoComplete="address-line2"
            label={PROFILE_FIELD_LABELS.building}
            {...fields.fieldOf("building")}
          />
        </FieldGroup>
      ),
    },
    {
      id: "confirm",
      title: "確認",
      content: <RegistrationSummary control={fields.control} />,
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

      <WizardForm label="登録" steps={steps} submit={<SubmitButton />} />
    </form>
  );
}
