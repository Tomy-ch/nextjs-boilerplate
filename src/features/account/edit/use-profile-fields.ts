"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState } from "react";
import type { UseFormGetValues, UseFormRegisterReturn, UseFormSetValue } from "react-hook-form";
import { useForm } from "react-hook-form";

import type { ProfileField, ProfileInput } from "@/model/user/profile-schema";
import { isRequiredProfileField, profileSchema } from "@/model/user/profile-schema";
import type { UserProfile } from "@/model/user/user";

import type { ProfileFormState } from "../form-state";

/**
 * 入力欄へ渡す配線。
 *
 * @remarks
 * `register` が返すものに focus の通知を足した形です。**どの項目を編集中か**は
 * [0062](../../../docs/adr/0062-form-input-validation.md) の「focus 中は消える方向にだけ
 * 効かせる」の判定に要り、rhf は focus を追跡しません。
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
 * プロフィール入力の検証と、誤りをいつ見せるかを持つ。
 *
 * @remarks
 * 検証そのもの（どの値が正しいか）は `model` の表示検証スキーマが持ちます。ここが持つのは
 * **いつ見せるか**だけです。
 *
 * 誤りを出すのは focus が外れた時点で、focus が当たっている間は消える方向にだけ効かせます
 * （reward early, punish late。[0062](../../../docs/adr/0062-form-input-validation.md)）。これを
 * 満たすのに 2 つ要ります。
 *
 * 1. `mode: "onTouched"` —— 一度 focus が外れた項目を変更のたびに見直す。rhf の
 *    `reValidateMode` は **submit のあとにしか効かない**ため、これが無いと直しても消えない
 * 2. focus 中の表示を「焦点を当てた時点の文言」で頭打ちにする —— 無いと、書き直そうとして
 *    1 文字消しただけで「入力してください」が現れる
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
  // 編集中の項目と、焦点を当てた時点に出ていた文言。1 つの値にするのは、片方だけが残ると
  // 別の項目の文言を頭打ちに使ってしまうためである。
  const [editing, setEditing] = useState<{
    readonly field: ProfileField;
    readonly messageAtFocus: string | undefined;
  } | null>(null);
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

  function displayedMessageOf(field: ProfileField): string | undefined {
    const current = messageOf(field);

    if (editing?.field !== field || current === undefined) {
      return current;
    }

    return editing.messageAtFocus;
  }

  function fieldOf(field: ProfileField): ProfileFieldProps {
    const registration = register(field);

    return {
      controlId: `${idPrefix}-${field}`,
      errorId: `${idPrefix}-${field}-error`,
      required: isRequiredProfileField(field),
      message: displayedMessageOf(field),
      registration: {
        ...registration,
        // 焦点を当てた時点の文言を控えるのはここ。描画からは読めない。
        onFocus: () => {
          setEditing({ field, messageAtFocus: messageOf(field) });
        },
        onBlur: async (event) => {
          setEditing(null);
          await registration.onBlur(event);
        },
      },
    };
  }

  return { fieldOf, getValues, setValue };
}
