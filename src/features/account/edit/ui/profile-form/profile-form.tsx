"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import type { ReactNode } from "react";
import { useActionState, useEffect, useId } from "react";
import { useFormStatus } from "react-dom";
import type { UseFormRegisterReturn } from "react-hook-form";
import { useForm } from "react-hook-form";

import { FormFeedback } from "@/components/app-starter/form-feedback/form-feedback";
import { Button } from "@/components/design-system/action/button/button";
import { BUTTON_VARIANT } from "@/components/design-system/action/button/button.definition";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/design-system/form/field/field";
import type { InputProps } from "@/components/design-system/form/input/input";
import { Input } from "@/components/design-system/form/input/input";
import {
  SelectNative,
  SelectNativeOption,
} from "@/components/design-system/form/select-native/select-native";
import { useToast } from "@/components/shell/toaster/toaster";
import { idleActionState } from "@/model/action-state";
import type { ProfileField, ProfileInput } from "@/model/user/profile-schema";
import { profileSchema } from "@/model/user/profile-schema";
import type { Prefecture, UserProfile } from "@/model/user/user";

import { updateProfileAction } from "../../../actions";
import type { ProfileFormState } from "../../../form-state";
import { MYPAGE_PATH } from "../../../paths";

const SUBMIT_LABEL = "保存する";
const PENDING_LABEL = "保存しています…";

/**
 * control とエラー表示の `id` の組。
 *
 * @remarks
 * 接頭辞を実行時に受け取ります。項目名をそのまま `id` にすると、同じフォームを 1 つの文書へ
 * 2 度置いたときに重複し、label がどちらの control を指すか決まらなくなります。
 */
function fieldIdsOf(prefix: string, field: ProfileField) {
  return { controlId: `${prefix}-${field}`, errorId: `${prefix}-${field}-error` };
}

type FieldFrameProps = {
  readonly children: ReactNode;
  readonly controlId: string;
  readonly errorId: string;
  readonly label: string;
  readonly message: string | undefined;
};

/** label・control・エラーの組。control だけを差し替えられるように外枠を分けている。 */
function FieldFrame({ children, controlId, errorId, label, message }: FieldFrameProps) {
  return (
    <Field data-invalid={message !== undefined}>
      <FieldLabel htmlFor={controlId}>{label}</FieldLabel>
      {children}
      {message === undefined ? null : <FieldError id={errorId}>{message}</FieldError>}
    </Field>
  );
}

type TextFieldProps = Pick<InputProps, "autoComplete" | "inputMode" | "placeholder" | "type"> & {
  readonly controlId: string;
  readonly errorId: string;
  readonly label: string;
  readonly message: string | undefined;
  readonly registration: UseFormRegisterReturn;
};

/** 1 行入力の項目。 */
function TextField({ controlId, errorId, label, message, registration, ...input }: TextFieldProps) {
  return (
    <FieldFrame controlId={controlId} errorId={errorId} label={label} message={message}>
      <Input
        aria-describedby={message === undefined ? undefined : errorId}
        aria-invalid={message !== undefined}
        id={controlId}
        {...input}
        {...registration}
      />
    </FieldFrame>
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
 * 送信は `<form action>` に委ねます（[0061](../../../../../docs/adr/0061-form-mutation-ux.md)）。
 * react-hook-form が持つのは入力中の検証だけで、送信機構は置き換えません。JavaScript が動かない
 * 環境でも form はそのまま送信され、server 側が同じスキーマで検証します。
 *
 * 検証の時機は submit 時、以後は誤りのあった項目だけを変更のたびに見ます
 * （[0062](../../../../../docs/adr/0062-form-input-validation.md)）。入力の最初の 1 文字から
 * 赤くすると、まだ書いている途中の項目を誤りとして知らせることになります。
 *
 * 文言は client 側を優先し、無ければ server の応答を使います。両方が出るのは client の検証を
 * 通った値が server で弾かれた場合だけで、そのときに読ませたいのは server の理由です。
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
  const idPrefix = useId();
  const {
    formState: { errors },
    register,
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      phone: profile.phone,
      postalCode: profile.postalCode,
      prefecture: profile.prefecture,
      city: profile.city,
      street: profile.street,
      building: profile.building ?? "",
    },
  });

  useEffect(() => {
    if (state.status === "success") {
      toast({ title: "プロフィールを保存しました" });
    }
  }, [state, toast]);

  function messageOf(field: ProfileField): string | undefined {
    const fromServer = state.status === "error" ? state.fieldErrors?.[field] : undefined;

    return errors[field]?.message ?? fromServer?.[0];
  }

  const prefectureMessage = messageOf("prefecture");
  const prefectureIds = fieldIdsOf(idPrefix, "prefecture");

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
          <TextField
            autoComplete="family-name"
            {...fieldIdsOf(idPrefix, "lastName")}
            label="姓"
            message={messageOf("lastName")}
            registration={register("lastName")}
          />
          <TextField
            autoComplete="given-name"
            {...fieldIdsOf(idPrefix, "firstName")}
            label="名"
            message={messageOf("firstName")}
            registration={register("firstName")}
          />
        </div>
      </FieldSet>

      <FieldSet>
        <FieldLegend>連絡先</FieldLegend>
        <FieldGroup>
          <TextField
            autoComplete="email"
            {...fieldIdsOf(idPrefix, "email")}
            label="メールアドレス"
            message={messageOf("email")}
            registration={register("email")}
            type="email"
          />
          <TextField
            autoComplete="tel"
            {...fieldIdsOf(idPrefix, "phone")}
            inputMode="tel"
            label="電話番号"
            message={messageOf("phone")}
            registration={register("phone")}
            type="tel"
          />
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>住所</FieldLegend>
        <FieldGroup>
          <div className="grid gap-6 sm:grid-cols-2">
            <TextField
              autoComplete="postal-code"
              {...fieldIdsOf(idPrefix, "postalCode")}
              inputMode="numeric"
              label="郵便番号"
              message={messageOf("postalCode")}
              placeholder="150-0001"
              registration={register("postalCode")}
            />
            <FieldFrame {...prefectureIds} label="都道府県" message={prefectureMessage}>
              <SelectNative
                aria-describedby={
                  prefectureMessage === undefined ? undefined : prefectureIds.errorId
                }
                aria-invalid={prefectureMessage !== undefined}
                autoComplete="address-level1"
                id={prefectureIds.controlId}
                {...register("prefecture")}
              >
                {prefectures.map((prefecture) => (
                  <SelectNativeOption key={prefecture.id} value={prefecture.name}>
                    {prefecture.name}
                  </SelectNativeOption>
                ))}
              </SelectNative>
            </FieldFrame>
          </div>
          <TextField
            autoComplete="address-level2"
            {...fieldIdsOf(idPrefix, "city")}
            label="市区町村"
            message={messageOf("city")}
            registration={register("city")}
          />
          <TextField
            autoComplete="address-line1"
            {...fieldIdsOf(idPrefix, "street")}
            label="丁目・番地"
            message={messageOf("street")}
            registration={register("street")}
          />
          <TextField
            autoComplete="address-line2"
            {...fieldIdsOf(idPrefix, "building")}
            label="建物名・部屋番号（任意）"
            message={messageOf("building")}
            registration={register("building")}
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
