"use client";

import {
  SelectNative,
  SelectNativeOption,
} from "@/components/design-system/form/select-native/select-native";
import { FormField } from "@/components/patterns/form-field/form-field";
import type { Prefecture } from "@/model/user/user";

import type { ProfileFieldProps } from "../../use-profile-fields";

type PrefectureFieldProps = ProfileFieldProps & {
  readonly prefectures: readonly Prefecture[];
};

/**
 * 都道府県の項目。
 *
 * @remarks
 * `TextField` と同じ理由で切り出してあります。**入力欄の ARIA 属性を与えるのはここ**で、
 * `FormField` は children を受け取る形なので入力欄へ触れず、呼び出し側で毎回書くと付け忘れが
 * 起きます。入力欄が `Input` ではなく `SelectNative` になるだけで、配線の規則は変わりません。
 *
 * 検索つきの client island を使いません。契約が全 47 件を固定で返す静的な候補なので、
 * 持ち込む理由がありません（[0053](../../../../../../docs/adr/0053-ui-component-interaction-seam.md)）。
 */
export function PrefectureField({
  controlId,
  errorId,
  message,
  prefectures,
  registration,
  required,
}: PrefectureFieldProps) {
  return (
    <FormField
      controlId={controlId}
      errorId={errorId}
      label="都道府県"
      message={message}
      required={required}
    >
      <SelectNative
        aria-describedby={message === undefined ? undefined : errorId}
        aria-invalid={message !== undefined}
        aria-required={required}
        autoComplete="address-level1"
        id={controlId}
        {...registration}
      >
        {prefectures.map((option) => (
          <SelectNativeOption key={option.id} value={option.name}>
            {option.name}
          </SelectNativeOption>
        ))}
      </SelectNative>
    </FormField>
  );
}
