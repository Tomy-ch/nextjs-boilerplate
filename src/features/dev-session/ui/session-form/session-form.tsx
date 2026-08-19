"use client";

import { useActionState, useId } from "react";
import { useFormStatus } from "react-dom";

import { FormFeedback } from "@/components/app-starter/form-feedback/form-feedback";
import { Button } from "@/components/design-system/action/button/button";
import { Input } from "@/components/design-system/form/input/input";
import { Label } from "@/components/design-system/form/label/label";
import {
  RadioGroupNative,
  RadioGroupNativeItem,
} from "@/components/design-system/form/radio-group-native/radio-group-native";
import { Textarea } from "@/components/design-system/form/textarea/textarea";
import { FormField } from "@/components/patterns/form-field/form-field";
import { idleActionState } from "@/model/action-state";
import { SESSION_ROLE, type SessionRole } from "@/model/session";

import type { DevSessionFormState, IssueDevSessionAction } from "../../form-state";
import { RETURN_URL_PARAM } from "../../paths";

/** `DevSessionForm` の props。 */
export type DevSessionFormProps = {
  /** 発行したあとの戻り先。 */
  returnUrl: string;
  /** 発行の送信先。route が渡す。 */
  action: IssueDevSessionAction;
};

/** 既定の subject。実在の利用者を指さない値にしておく。 */
const DEFAULT_SUBJECT = "dev-user";

/** 既定の失効までの秒数。 */
const DEFAULT_EXPIRES_IN_SECONDS = 3600;

const ROLE_LABEL: Readonly<Record<SessionRole, string>> = {
  [SESSION_ROLE.user]: "一般利用者",
  [SESSION_ROLE.admin]: "管理者",
};

const SUBMIT_LABEL = "この内容で入る";
const PENDING_LABEL = "session を発行しています";

/** 送信部。`useFormStatus` は form の子でしか状態を読めないため切り出している。 */
function IssueSubmit() {
  const { pending } = useFormStatus();

  return (
    <Button aria-label={pending ? PENDING_LABEL : undefined} disabled={pending} type="submit">
      {SUBMIT_LABEL}
    </Button>
  );
}

/**
 * IdP を通さずに session を発行する指定。
 *
 * @remarks
 * **貼る欄を持つのは、実物の API へ繋ぐときのため**です。モックへ繋いでいる間は Bearer が検証
 * される先が無いので、空欄のままで足ります。実データを見るときだけ、バックエンドの発行口で
 * 取ったトークンを貼ります。
 *
 * 役割は radio です。同時に 1 つしか選べないものを選ぶ操作であり、既定を持ちます
 * （[0053](../../../../../docs/adr/0053-ui-component-interaction-seam.md)）。
 *
 * 失効までの秒数を指定できるのは、**失効したときの見え方を確かめるため**です。短い値を入れると、
 * その秒数のあとに保護された画面がどうなるかを実際に踏めます。
 */
export function DevSessionForm({ returnUrl, action }: DevSessionFormProps) {
  const [state, formAction] = useActionState<DevSessionFormState, FormData>(
    action,
    idleActionState(),
  );
  const subjectId = useId();
  const expiresId = useId();
  const tokenId = useId();
  const errors = state.status === "error" ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input name={RETURN_URL_PARAM} type="hidden" value={returnUrl} />

      <FormField
        controlId={subjectId}
        description="この値がそのまま session の利用者 ID になります。"
        errorId={`${subjectId}-error`}
        label="誰として入るか"
        message={errors?.subject?.[0]}
        required
      >
        <Input
          aria-describedby={errors?.subject === undefined ? undefined : `${subjectId}-error`}
          aria-invalid={errors?.subject !== undefined}
          aria-required
          defaultValue={DEFAULT_SUBJECT}
          id={subjectId}
          name="subject"
        />
      </FormField>

      <RadioGroupNative>
        <legend className="mb-3 font-emphasis text-sm">役割</legend>
        {Object.values(SESSION_ROLE).map((role) => (
          <div className="flex items-center gap-2" key={role}>
            <RadioGroupNativeItem
              defaultChecked={role === SESSION_ROLE.user}
              id={`${subjectId}-${role}`}
              name="role"
              value={role}
            />
            <Label htmlFor={`${subjectId}-${role}`}>{ROLE_LABEL[role]}</Label>
          </div>
        ))}
      </RadioGroupNative>

      <FormField
        controlId={expiresId}
        description="短くすると、失効したあとの見え方をその場で確かめられます。"
        errorId={`${expiresId}-error`}
        label="失効までの秒数"
        message={errors?.expiresInSeconds?.[0]}
        required
      >
        <Input
          aria-describedby={
            errors?.expiresInSeconds === undefined ? undefined : `${expiresId}-error`
          }
          aria-invalid={errors?.expiresInSeconds !== undefined}
          aria-required
          defaultValue={DEFAULT_EXPIRES_IN_SECONDS}
          id={expiresId}
          inputMode="numeric"
          name="expiresInSeconds"
        />
      </FormField>

      <FormField
        controlId={tokenId}
        description="モックへ繋いでいる間は空欄で足ります。実物の API へ繋ぐときだけ貼ります。"
        errorId={`${tokenId}-error`}
        label="Access Token（任意）"
        message={errors?.accessToken?.[0]}
        required={false}
      >
        <Textarea
          aria-describedby={errors?.accessToken === undefined ? undefined : `${tokenId}-error`}
          aria-invalid={errors?.accessToken !== undefined}
          className="font-mono text-xs"
          id={tokenId}
          name="accessToken"
          rows={4}
        />
      </FormField>

      <div className="flex flex-col gap-2">
        <IssueSubmit />
        {state.status === "error" && state.formError !== null ? (
          <FormFeedback
            description={state.formError}
            title="session を発行できませんでした"
            variant="destructive"
          />
        ) : null}
      </div>
    </form>
  );
}
