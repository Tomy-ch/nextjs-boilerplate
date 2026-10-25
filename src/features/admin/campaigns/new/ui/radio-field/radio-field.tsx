"use client";

import { useId } from "react";

import { FieldError } from "@/components/design-system/form/field/field";
import { toErrorId } from "@/components/design-system/form/field/field.definition";
import { Label } from "@/components/design-system/form/label/label";
import {
  RadioGroupNative,
  RadioGroupNativeItem,
} from "@/components/design-system/form/radio-group-native/radio-group-native";
import { RequirementBadge } from "@/components/design-system/form/requirement-badge/requirement-badge";

/** {@link AdminRadioField} が並べる選択肢 1 つ。 */
export type AdminRadioOption<TValue extends string> = {
  readonly value: TValue;
  readonly label: string;
};

/** `AdminRadioField` の props。 */
export type AdminRadioFieldProps<TValue extends string> = {
  /** 送信時の名前。 */
  name: string;
  /** 選択肢の群の名前。 */
  legend: string;
  /** 並べる選択肢。並び順のまま出す。 */
  options: readonly AdminRadioOption<TValue>[];
  /** 選ばれている値。まだ選んでいなければ空。 */
  value: TValue | "";
  /** 選び直したことを伝える。 */
  onValueChange: (value: TValue) => void;
  /** 誤りの文言。 */
  message?: string;
  /** 選ばずには送れない項目か。 */
  required: boolean;
};

/**
 * 少数の選択肢から 1 つを選ぶ項目。
 *
 * @remarks
 * **native の radio で組みます。** 選択肢は固定で少なく、独自の keyboard 操作も要りません。
 *
 * **既定の選択を置きません。** 最初から 1 つ選ばれていると、確かめずに送った値と意図して選んだ
 * 値が区別できません（[ADR 0062](../../../../../docs/adr/0062-form-input-validation.md)）。
 *
 * **値は呼び出し元が持ちます。** 選び直しで出し分ける欄があるため、外側が選択を知っている必要が
 * あります。
 *
 * 誤りは群に結び付けます。どの選択肢を選んでも直る誤りなので、選択肢それぞれに付けません。
 *
 * @param props - 群の名前・選択肢・選ばれている値と、誤りの文言。
 *
 * @see Storybook `Features/Admin/Campaigns/New/RadioField`
 */
export function AdminRadioField<TValue extends string>({
  legend,
  message,
  name,
  onValueChange,
  options,
  required,
  value,
}: AdminRadioFieldProps<TValue>) {
  const idPrefix = useId();
  const errorId = toErrorId(idPrefix);

  return (
    <RadioGroupNative
      aria-describedby={message === undefined ? undefined : errorId}
      className="gap-2"
    >
      <legend className="mb-2 flex items-center gap-2 font-emphasis text-sm">
        <RequirementBadge required={required} />
        {legend}
      </legend>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {options.map((option) => (
          <Label
            className="flex items-center gap-2"
            htmlFor={`${idPrefix}${option.value}`}
            key={option.value}
          >
            <RadioGroupNativeItem
              aria-invalid={message !== undefined}
              checked={value === option.value}
              id={`${idPrefix}${option.value}`}
              name={name}
              onChange={() => onValueChange(option.value)}
              value={option.value}
            />
            {option.label}
          </Label>
        ))}
      </div>
      {message === undefined ? null : <FieldError id={errorId}>{message}</FieldError>}
    </RadioGroupNative>
  );
}
