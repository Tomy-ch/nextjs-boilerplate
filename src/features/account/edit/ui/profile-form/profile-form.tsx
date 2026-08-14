"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import type { ReactNode } from "react";
import { useActionState, useCallback, useEffect, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import type { UseFormRegisterReturn } from "react-hook-form";
import { useForm } from "react-hook-form";

import { FormFeedback } from "@/components/app-starter/form-feedback/form-feedback";
import { Button } from "@/components/design-system/action/button/button";
import { BUTTON_VARIANT } from "@/components/design-system/action/button/button.definition";
import { Badge } from "@/components/design-system/display/badge/badge";
import { BADGE_VARIANT } from "@/components/design-system/display/badge/badge.definition";
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
import { useToast } from "@/components/shell/toaster/toaster";
import { idleActionState } from "@/model/action-state";
import type { ProfileField, ProfileInput } from "@/model/user/profile-schema";
import { isRequiredProfileField, profileSchema } from "@/model/user/profile-schema";
import type { Prefecture, UserProfile } from "@/model/user/user";

import { updateProfileAction } from "../../../actions";
import type { ProfileFormState } from "../../../form-state";
import { MYPAGE_PATH } from "../../../paths";
import type { AddressCompletion, AddressCompletionResult } from "../../use-address-completion";
import { useAddressCompletion } from "../../use-address-completion";

const SUBMIT_LABEL = "保存する";
const PENDING_LABEL = "保存しています…";

/**
 * 補完の結果に対応する読み上げ用の文言。
 *
 * @remarks
 * 待機中の文言を持ちません。取得の間だけ差し替えると、応答が速いときに直前の結果と入れ替わって
 * 戻り、文字が明滅します。進行中であることは操作の側（押せない状態）が示します。
 */
const COMPLETION_MESSAGES: Readonly<Record<AddressCompletionResult, string>> = {
  idle: "",
  filled: "郵便番号から住所を補完しました。番地から先を入力してください。",
  empty: "この郵便番号に該当する住所が見つかりませんでした。手入力を続けてください。",
};

/**
 * 項目 1 つぶんの、値に依らない属性。
 *
 * @remarks
 * `id` の接頭辞を実行時に受け取ります。項目名をそのまま `id` にすると、同じフォームを 1 つの
 * 文書へ 2 度置いたときに重複し、label がどちらの control を指すか決まらなくなります。
 *
 * 必須かどうかはスキーマから引きます。ここで列挙すると、規則を緩めたのに画面が必須のままと
 * いう状態を作れます。
 */
function fieldPropsOf(prefix: string, field: ProfileField) {
  return {
    controlId: `${prefix}-${field}`,
    errorId: `${prefix}-${field}-error`,
    required: isRequiredProfileField(field),
  };
}

/**
 * 必須か任意かの印。
 *
 * @remarks
 * 読み上げからは外します（`aria-hidden`）。必須かどうかは control 側の `aria-required` が
 * 伝えており、印まで読ませると二重になります。
 *
 * 塗りつぶさず、縁と淡い地で示します。**塗ると誤りの表示と同じ強さになり**、何も間違えて
 * いない画面に赤い塊が項目の数だけ並びます。誤りは文言と枠の色で示すので、印はそこまで
 * 強い必要がありません。
 *
 * 任意の側にも印を出します。印の有無で読み分けさせると、印が無いのが「任意」なのか「印を
 * 付け忘れた」のかを利用者が区別できません。
 *
 * label の前に置きます。**どちらの文言も 2 文字なので、印の列と label の開始位置が同時に
 * 揃います。**後ろに置くと、label の長さがまちまちなぶん印が階段状に散らばります。
 */
function RequirementBadge({ required }: { readonly required: boolean }) {
  return required ? (
    <Badge
      aria-hidden="true"
      className="border-destructive/40 bg-destructive/10 text-destructive"
      variant={BADGE_VARIANT.OUTLINE}
    >
      必須
    </Badge>
  ) : (
    <Badge
      aria-hidden="true"
      className="border-muted-foreground/40 text-muted-foreground"
      variant={BADGE_VARIANT.OUTLINE}
    >
      任意
    </Badge>
  );
}

type FieldFrameProps = {
  readonly children: ReactNode;
  readonly controlId: string;
  readonly errorId: string;
  readonly label: string;
  readonly message: string | undefined;
  readonly required: boolean;
};

/**
 * label・control・エラーの組。
 *
 * @remarks
 * control だけを差し替えられるように外枠を分けています。
 *
 * 印は **視覚のためだけ**に置き、`label` の外へ並べます。必須かどうかは control 側の
 * `aria-required` が伝えており（付けるのは呼び出し元です）、`label` の中に入れると項目の名前が
 * 「姓必須」に変わってしまいます。読み上げも「姓、必須、required」と二重になります。
 */
function FieldFrame({ children, controlId, errorId, label, message, required }: FieldFrameProps) {
  return (
    <Field data-invalid={message !== undefined}>
      <div className="flex items-center gap-2">
        <RequirementBadge required={required} />
        <FieldLabel htmlFor={controlId}>{label}</FieldLabel>
      </div>
      {children}
      {message === undefined ? null : <FieldError id={errorId}>{message}</FieldError>}
    </Field>
  );
}

/**
 * 入力欄へ渡す配線。
 *
 * @remarks
 * `register` が返すものに focus の通知を足した形です。**どの項目を編集中か**は
 * [0062](../../../../../docs/adr/0062-form-input-validation.md) の「focus 中は消える方向にだけ
 * 効かせる」の判定に要り、rhf は focus を追跡しません。
 */
type FieldRegistration = UseFormRegisterReturn & {
  readonly onFocus: () => void;
};

type TextFieldProps = Pick<InputProps, "autoComplete" | "inputMode" | "placeholder" | "type"> & {
  readonly controlId: string;
  readonly errorId: string;
  readonly label: string;
  readonly message: string | undefined;
  readonly registration: FieldRegistration;
  readonly required: boolean;
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
    <FieldFrame
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
 * 誤りを出すのは focus が外れた時点で、focus が当たっている間は消える方向にだけ効かせます
 * （[0062](../../../../../docs/adr/0062-form-input-validation.md)）。編集の途中に新しい誤りを
 * 出すと、書き直そうとして 1 文字消しただけの利用者を咎めることになります。一方、直したことは
 * その場で反映します。消えないと、focus を外すまで直ったかどうかを確かめられません。
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
    // 一度 focus が外れた項目は変更のたびに見直す。`reValidateMode` は submit のあとにしか
    // 効かないため、これだけが「直したら消える」を submit 前から成立させる手段になる
    // （[0062](../../../../../docs/adr/0062-form-input-validation.md) 補足）。
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

  useEffect(() => {
    if (state.status === "success") {
      toast({ title: "プロフィールを保存しました" });
    }
  }, [state, toast]);

  const applyCompletion = useCallback(
    ({ city, prefecture, town }: AddressCompletion) => {
      if (prefecture !== undefined) {
        setValue("prefecture", prefecture, { shouldValidate: true });
      }

      if (city !== undefined) {
        setValue("city", city, { shouldValidate: true });
      }

      // 番地は補完に含まれない。既に書いてある町域と番地を町域だけで置き換えないよう、
      // 空のときにだけ入れる。
      if (town !== undefined && getValues("street") === "") {
        setValue("street", town, { shouldValidate: true });
      }
    },
    [getValues, setValue],
  );

  const {
    complete,
    loading: completionLoading,
    result: completionResult,
  } = useAddressCompletion(applyCompletion);
  const handleSearchClick = useCallback(() => {
    void complete(getValues("postalCode"), { force: true });
  }, [complete, getValues]);

  function messageOf(field: ProfileField): string | undefined {
    const fromServer = state.status === "error" ? state.fieldErrors?.[field] : undefined;

    return errors[field]?.message ?? fromServer?.[0];
  }

  /**
   * 実際に出す文言。
   *
   * @remarks
   * focus が当たっている項目では、**焦点を当てた時点に出ていた文言を上限にします**。直れば
   * 消え、直っていなければ文言は変わりません。編集の途中で新しい誤りを出さないための頭打ちで、
   * これが無いと 1 文字消しただけで「入力してください」が現れます
   * （[0062](../../../../../docs/adr/0062-form-input-validation.md)）。
   */
  function displayedMessageOf(field: ProfileField): string | undefined {
    const current = messageOf(field);

    if (editing?.field !== field || current === undefined) {
      return current;
    }

    return editing.messageAtFocus;
  }

  /**
   * 入力欄 1 つぶんの配線を組む。
   *
   * @remarks
   * focus の出入りを掴むために `register` の結果を包みます。焦点を当てた時点の文言を控えるのは
   * このときで、描画からは読めません。
   */
  function registrationOf(field: ProfileField): FieldRegistration {
    const registration = register(field);

    return {
      ...registration,
      onFocus: () => {
        setEditing({ field, messageAtFocus: messageOf(field) });
      },
      onBlur: async (event) => {
        setEditing(null);
        await registration.onBlur(event);
      },
    };
  }

  const prefectureMessage = displayedMessageOf("prefecture");
  const prefectureIds = fieldPropsOf(idPrefix, "prefecture");
  const postalCodeMessage = displayedMessageOf("postalCode");
  const postalCodeIds = fieldPropsOf(idPrefix, "postalCode");

  // 郵便番号だけ、検証のあとに補完も走らせる。register が返す onBlur は検証しか持たないので
  // 差し替えずに包む。落とすと、この項目だけ検証されなくなる。
  const postalCodeRegistration = registrationOf("postalCode");
  const postalCodeWiring: FieldRegistration = {
    ...postalCodeRegistration,
    onBlur: async (event) => {
      await postalCodeRegistration.onBlur(event);
      await complete(String(event.target.value ?? ""));
    },
  };

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
            {...fieldPropsOf(idPrefix, "lastName")}
            label="姓"
            message={displayedMessageOf("lastName")}
            registration={registrationOf("lastName")}
          />
          <TextField
            autoComplete="given-name"
            {...fieldPropsOf(idPrefix, "firstName")}
            label="名"
            message={displayedMessageOf("firstName")}
            registration={registrationOf("firstName")}
          />
        </div>
      </FieldSet>

      <FieldSet>
        <FieldLegend>連絡先</FieldLegend>
        <FieldGroup>
          <TextField
            autoComplete="email"
            {...fieldPropsOf(idPrefix, "email")}
            label="メールアドレス"
            message={displayedMessageOf("email")}
            registration={registrationOf("email")}
            type="email"
          />
          <TextField
            autoComplete="tel"
            {...fieldPropsOf(idPrefix, "phone")}
            inputMode="tel"
            label="電話番号"
            message={displayedMessageOf("phone")}
            registration={registrationOf("phone")}
            type="tel"
          />
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>住所</FieldLegend>
        <FieldGroup>
          {/* 補完は focus が外れた時点で走る。起きたことを画面の変化だけで伝えると、
              入力欄を見ていない利用者には届かない。 */}
          <p className="text-sm text-muted-foreground" role="status">
            {COMPLETION_MESSAGES[completionResult]}
          </p>
          <FieldFrame {...postalCodeIds} label="郵便番号" message={postalCodeMessage}>
            {/* 補完は focus が外れた時点でも走る。操作を枠の中へ収めるのは、いつ走るのかを
                利用者が決められるようにしつつ、どの入力に属する操作かを離さないためである。 */}
            <InputGroup className="sm:max-w-sm">
              <InputGroupInput
                aria-describedby={
                  postalCodeMessage === undefined ? undefined : postalCodeIds.errorId
                }
                aria-invalid={postalCodeMessage !== undefined}
                aria-required={postalCodeIds.required}
                autoComplete="postal-code"
                id={postalCodeIds.controlId}
                inputMode="numeric"
                placeholder="150-0001"
                {...postalCodeWiring}
              />
              <InputGroupAddon align={INPUT_GROUP_ADDON_ALIGN.INLINE_END}>
                <InputGroupButton
                  disabled={completionLoading}
                  onClick={handleSearchClick}
                  size={INPUT_GROUP_BUTTON_SIZE.SMALL}
                  type="button"
                >
                  住所を検索
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </FieldFrame>
          <FieldFrame {...prefectureIds} label="都道府県" message={prefectureMessage}>
            <SelectNative
              aria-describedby={prefectureMessage === undefined ? undefined : prefectureIds.errorId}
              aria-invalid={prefectureMessage !== undefined}
              aria-required={prefectureIds.required}
              autoComplete="address-level1"
              id={prefectureIds.controlId}
              {...registrationOf("prefecture")}
            >
              {prefectures.map((prefecture) => (
                <SelectNativeOption key={prefecture.id} value={prefecture.name}>
                  {prefecture.name}
                </SelectNativeOption>
              ))}
            </SelectNative>
          </FieldFrame>
          <TextField
            autoComplete="address-level2"
            {...fieldPropsOf(idPrefix, "city")}
            label="市区町村"
            message={displayedMessageOf("city")}
            registration={registrationOf("city")}
          />
          <TextField
            autoComplete="address-line1"
            {...fieldPropsOf(idPrefix, "street")}
            label="丁目・番地"
            message={displayedMessageOf("street")}
            registration={registrationOf("street")}
          />
          <TextField
            autoComplete="address-line2"
            {...fieldPropsOf(idPrefix, "building")}
            label="建物名・部屋番号"
            message={displayedMessageOf("building")}
            registration={registrationOf("building")}
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
