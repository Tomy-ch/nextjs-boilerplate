"use client";

import { useCallback } from "react";

import type { ProfileInput } from "@/model/user/profile-schema";

import type { AddressCompletion, AddressCompletionResult } from "./use-address-completion";
import { useAddressCompletion } from "./use-address-completion";
import type { FieldRegistration, ProfileFields } from "./use-profile-fields";

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
  unavailable: "住所の自動入力がいま使えません。都道府県から先を手入力してください。",
};

/** {@link useAddressField} が返すもの。 */
export type AddressField = {
  /** 郵便番号の入力欄へ渡す配線。検証のあとに補完も走る。 */
  readonly registration: FieldRegistration;
  /** 検索の操作。 */
  readonly onSearch: () => void;
  /** 取得の最中か。操作を押せなくするのに使う。 */
  readonly searching: boolean;
  /**
   * 補完の機構が使えないと判った状態か。
   *
   * @remarks
   * 該当なしとは分けます。押しても永久に何も起きない操作を押せるままにすると、利用者は
   * 郵便番号を疑って何度も試します。
   */
  readonly unavailable: boolean;
  /** 読み上げ用の文言。何も起きていなければ空。 */
  readonly message: string;
};

/**
 * 郵便番号の入力欄に、住所の補完を足す。
 *
 * @remarks
 * 補完そのもの（取得・候補の突き合わせ・打ち切り）は {@link useAddressCompletion} が持ちます。
 * ここが持つのは**フォームへの当て方**だけです。
 *
 * 検証と補完の両方を blur で走らせます。`register` が返す `onBlur` は検証しか持たないので、
 * 差し替えずに包みます。落とすと、この項目だけ検証されなくなります。
 *
 * 番地は補完に含まれないため、町域を入れるのは丁目・番地が空のときだけです。既に書いてある
 * 町域と番地を町域だけで置き換えません。
 *
 * @param fields - `useProfileFields` が返すもの。郵便番号の配線と値の書き込みに使う
 */
export function useAddressField({ fieldOf, getValues, setValue }: ProfileFields): AddressField {
  const applyCompletion = useCallback(
    ({ city, prefecture, town }: AddressCompletion) => {
      if (prefecture !== undefined) {
        setValue("prefecture", prefecture, { shouldValidate: true });
      }

      if (city !== undefined) {
        setValue("city", city, { shouldValidate: true });
      }

      if (town !== undefined && getValues("street") === "") {
        setValue("street", town, { shouldValidate: true });
      }
    },
    [getValues, setValue],
  );

  const { complete, loading, result } = useAddressCompletion(applyCompletion);

  const onSearch = useCallback(() => {
    void complete(getValues("postalCode" satisfies keyof ProfileInput), { force: true });
  }, [complete, getValues]);

  const validatingRegistration = fieldOf("postalCode").registration;

  return {
    registration: {
      ...validatingRegistration,
      onBlur: async (event) => {
        await validatingRegistration.onBlur(event);
        await complete(String(event.target.value));
      },
    },
    onSearch,
    searching: loading,
    unavailable: result === "unavailable",
    message: COMPLETION_MESSAGES[result],
  };
}
