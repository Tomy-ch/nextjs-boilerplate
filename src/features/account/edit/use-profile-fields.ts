"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId } from "react";
import type { UseFormGetValues, UseFormRegisterReturn, UseFormSetValue } from "react-hook-form";
import { useForm } from "react-hook-form";

import type { ProfileField, ProfileInput } from "@/model/user/profile-schema";
import { isRequiredProfileField, profileSchema } from "@/model/user/profile-schema";
import type { UserProfile } from "@/model/user/user";

import type { ProfileFormState } from "../form-state";
import { useErrorVisibility } from "./use-error-visibility";

/**
 * 入力欄へ渡す配線。
 *
 * @remarks
 * `register` が返すものに focus の通知を足した形です。rhf は focus を追跡しないため、誤りをいつ
 * 見せるかの判定に要る分をここで補います。
 */
export type FieldRegistration = UseFormRegisterReturn & {
  readonly onFocus: () => void;
};

/** 入力欄 1 つを描くのに要るもの一式。 */
export type ProfileFieldProps = {
  readonly controlId: string;
  readonly errorId: string;
  readonly required: boolean;
  /** 実際に出す文言。出さないなら undefined。 */
  readonly message: string | undefined;
  readonly registration: FieldRegistration;
};

/** {@link useProfileFields} が返すもの。 */
export type ProfileFields = {
  /** 入力欄 1 つぶんの props を組む。 */
  readonly fieldOf: (field: ProfileField) => ProfileFieldProps;
  readonly getValues: UseFormGetValues<ProfileInput>;
  readonly setValue: UseFormSetValue<ProfileInput>;
};

/**
 * プロフィール入力の検証を回し、入力欄 1 つぶんの props を組む。
 *
 * @remarks
 * 持つのは**この画面の項目に固有のこと**です。どの値が正しいかは `model` の表示検証スキーマが、
 * 誤りをいつ見せるかは {@link useErrorVisibility} が持ちます。
 *
 * `mode: "onTouched"` にするのは、一度 focus が外れた項目を変更のたびに見直すためです。rhf の
 * `reValidateMode` は **submit のあとにしか効かない**ので、これが無いと直しても消えません
 * （[0062](../../../../docs/adr/0062-form-input-validation.md) 補足）。
 *
 * 必須かどうかはスキーマへ空文字を通して判定します。列挙すると、規則を緩めたのに画面が必須の
 * ままという状態を作れます。
 *
 * `id` の接頭辞は `useId()` から取ります。項目名をそのまま `id` にすると、同じフォームを 1 つの
 * 文書へ 2 度置いたときに重複し、label がどちらの control を指すか決まらなくなります。
 *
 * @param profile - 入力欄の初期値
 * @param state - server の応答。項目ごとの文言を client 側の検証より後ろに置く
 */
export function useProfileFields(profile: UserProfile, state: ProfileFormState): ProfileFields {
  const idPrefix = useId();
  const errorVisibility = useErrorVisibility<ProfileField>();
  const {
    formState: { errors },
    getValues,
    register,
    setValue,
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    mode: "onTouched",
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

  /** 検証の結果。client 側を優先し、無ければ server の応答を使う。 */
  function messageOf(field: ProfileField): string | undefined {
    const fromServer = state.status === "error" ? state.fieldErrors?.[field] : undefined;

    return errors[field]?.message ?? fromServer?.[0];
  }

  function fieldOf(field: ProfileField): ProfileFieldProps {
    const registration = register(field);
    const current = messageOf(field);
    const focus = errorVisibility.track(field, current);

    return {
      controlId: `${idPrefix}-${field}`,
      errorId: `${idPrefix}-${field}-error`,
      required: isRequiredProfileField(field),
      message: errorVisibility.visible(field, current),
      registration: {
        ...registration,
        onFocus: focus.onFocus,
        onBlur: async (event) => {
          focus.onBlur();
          await registration.onBlur(event);
        },
      },
    };
  }

  return { fieldOf, getValues, setValue };
}
