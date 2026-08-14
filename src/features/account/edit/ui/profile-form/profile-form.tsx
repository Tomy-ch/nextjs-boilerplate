"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";

import { FormFeedback } from "@/components/app-starter/form-feedback/form-feedback";
import { Button } from "@/components/design-system/action/button/button";
import { BUTTON_VARIANT } from "@/components/design-system/action/button/button.definition";
import { FieldGroup, FieldLegend, FieldSet } from "@/components/design-system/form/field/field";
import type { InputProps } from "@/components/design-system/form/input/input";
import { Input } from "@/components/design-system/form/input/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/design-system/form/input-group/input-group";
import {
  INPUT_GROUP_ADDON_ALIGN,
  INPUT_GROUP_BUTTON_SIZE,
} from "@/components/design-system/form/input-group/input-group.definition";
import {
  SelectNative,
  SelectNativeOption,
} from "@/components/design-system/form/select-native/select-native";
import { FormField } from "@/components/patterns/form-field/form-field";
import { useToast } from "@/components/shell/toaster/toaster";
import { idleActionState } from "@/model/action-state";
import type { Prefecture, UserProfile } from "@/model/user/user";

import { updateProfileAction } from "../../../actions";
import type { ProfileFormState } from "../../../form-state";
import { MYPAGE_PATH } from "../../../paths";
import { useAddressField } from "../../use-address-field";
import type { ProfileFieldProps } from "../../use-profile-fields";
import { useProfileFields } from "../../use-profile-fields";

const SUBMIT_LABEL = "保存する";
const PENDING_LABEL = "保存しています…";

type TextFieldProps = Pick<InputProps, "autoComplete" | "inputMode" | "placeholder" | "type"> &
  ProfileFieldProps & {
    readonly label: string;
  };

/** 1 行入力の項目。 */
function TextField({
  controlId,
  errorId,
  label,
  message,
  registration,
  required,
  ...input
}: TextFieldProps) {
  return (
    <FormField
      controlId={controlId}
      errorId={errorId}
      label={label}
      message={message}
      required={required}
    >
      <Input
        aria-describedby={message === undefined ? undefined : errorId}
        aria-invalid={message !== undefined}
        aria-required={required}
        id={controlId}
        {...input}
        {...registration}
      />
    </FormField>
  );
}

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

type ProfileFormProps = {
  readonly profile: UserProfile;
  readonly prefectures: readonly Prefecture[];
};

/**
 * プロフィール編集フォーム。
 *
 * @remarks
 * この部品が持つのは**並びだけ**です。検証といつ誤りを見せるかは `useProfileFields`、住所の
 * 補完は `useAddressField` が持ちます。
 *
 * 送信は `<form action>` に委ねます（[0061](../../../../../docs/adr/0061-form-mutation-ux.md)）。
 * react-hook-form が持つのは入力中の検証だけで、送信機構は置き換えません。JavaScript が動かない
 * 環境でも form はそのまま送信され、server 側が同じスキーマで検証します。
 *
 * 成功は toast で伝えます。画面を移さない保存なので、この場に留まる通知が合います
 * （[0063](../../../../../docs/adr/0063-mutation-result-notification.md)）。
 */
export function ProfileForm({ prefectures, profile }: ProfileFormProps) {
  const [state, formAction] = useActionState<ProfileFormState, FormData>(
    updateProfileAction,
    idleActionState(),
  );
  const { toast } = useToast();
  const fields = useProfileFields(profile, state);
  const address = useAddressField(fields);

  useEffect(() => {
    if (state.status === "success") {
      toast({ title: "プロフィールを保存しました" });
    }
  }, [state, toast]);

  const postalCode = fields.fieldOf("postalCode");
  const prefecture = fields.fieldOf("prefecture");

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-8">
      {state.status === "error" && state.formError !== null ? (
        <FormFeedback
          description={state.formError}
          title="保存できませんでした"
          variant="destructive"
        />
      ) : null}

      <FieldSet>
        <FieldLegend>基本情報</FieldLegend>
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField autoComplete="family-name" label="姓" {...fields.fieldOf("lastName")} />
          <TextField autoComplete="given-name" label="名" {...fields.fieldOf("firstName")} />
        </div>
      </FieldSet>

      <FieldSet>
        <FieldLegend>連絡先</FieldLegend>
        <FieldGroup>
          <TextField
            autoComplete="email"
            label="メールアドレス"
            type="email"
            {...fields.fieldOf("email")}
          />
          <TextField
            autoComplete="tel"
            inputMode="tel"
            label="電話番号"
            type="tel"
            {...fields.fieldOf("phone")}
          />
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>住所</FieldLegend>
        <FieldGroup>
          {/* 補完は focus が外れた時点で走る。起きたことを画面の変化だけで伝えると、
              入力欄を見ていない利用者には届かない。 */}
          <p className="text-sm text-muted-foreground" role="status">
            {address.message}
          </p>
          <FormField
            controlId={postalCode.controlId}
            errorId={postalCode.errorId}
            label="郵便番号"
            message={postalCode.message}
            required={postalCode.required}
          >
            {/* 操作を枠の中へ収めるのは、いつ補完が走るのかを利用者が決められるようにしつつ、
                どの入力に属する操作かを離さないためである。 */}
            <InputGroup className="sm:max-w-sm">
              <InputGroupInput
                aria-describedby={postalCode.message === undefined ? undefined : postalCode.errorId}
                aria-invalid={postalCode.message !== undefined}
                aria-required={postalCode.required}
                autoComplete="postal-code"
                id={postalCode.controlId}
                inputMode="numeric"
                placeholder="150-0001"
                {...address.registration}
              />
              <InputGroupAddon align={INPUT_GROUP_ADDON_ALIGN.INLINE_END}>
                <InputGroupButton
                  disabled={address.searching}
                  onClick={address.onSearch}
                  size={INPUT_GROUP_BUTTON_SIZE.SMALL}
                  type="button"
                >
                  住所を検索
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </FormField>
          <FormField
            controlId={prefecture.controlId}
            errorId={prefecture.errorId}
            label="都道府県"
            message={prefecture.message}
            required={prefecture.required}
          >
            <SelectNative
              aria-describedby={prefecture.message === undefined ? undefined : prefecture.errorId}
              aria-invalid={prefecture.message !== undefined}
              aria-required={prefecture.required}
              autoComplete="address-level1"
              id={prefecture.controlId}
              {...prefecture.registration}
            >
              {prefectures.map((option) => (
                <SelectNativeOption key={option.id} value={option.name}>
                  {option.name}
                </SelectNativeOption>
              ))}
            </SelectNative>
          </FormField>
          <TextField autoComplete="address-level2" label="市区町村" {...fields.fieldOf("city")} />
          <TextField
            autoComplete="address-line1"
            label="丁目・番地"
            {...fields.fieldOf("street")}
          />
          <TextField
            autoComplete="address-line2"
            label="建物名・部屋番号"
            {...fields.fieldOf("building")}
          />
        </FieldGroup>
      </FieldSet>

      <div className="flex justify-end gap-3">
        <Button asChild variant={BUTTON_VARIANT.OUTLINE}>
          <Link href={MYPAGE_PATH}>キャンセル</Link>
        </Button>
        <SubmitButton />
      </div>
    </form>
  );
}
