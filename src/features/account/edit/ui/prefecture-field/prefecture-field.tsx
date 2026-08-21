"use client";

import {
  SelectNative,
  SelectNativeOption,
} from "@/components/design-system/form/select-native/select-native";
import { fieldControlAttributes } from "@/components/patterns/form-field/field-attributes";
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
 * 入力欄が `Input` ではなく `SelectNative` になるだけで、`TextField` と配線の規則は変わりません。
 * 与える属性は `fieldControlAttributes` が組みます。
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
        {...fieldControlAttributes({ controlId, errorId, message, required })}
        autoComplete="address-level1"
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
