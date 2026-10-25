"use client";

import { useCallback, useId } from "react";

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
 * 値が区別できません。
 *
 * **値は呼び出し元が持ちます。** 選び直しで出し分ける欄があるため、外側が選択を知っている必要が
 * あります。
 *
 * 誤りは群に結び付けます。どの選択肢を選んでも直る誤りなので、選択肢それぞれに付けません。
 *
 * @param props - 群の名前・選択肢・選ばれている値と、誤りの文言。
 *
 * @see Storybook `Features/Admin/RadioField`
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
          <RadioFieldChoice
            checked={value === option.value}
            id={`${idPrefix}${option.value}`}
            invalid={message !== undefined}
            key={option.value}
            name={name}
            onChoose={onValueChange}
            option={option}
          />
        ))}
      </div>
      {message === undefined ? null : <FieldError id={errorId}>{message}</FieldError>}
    </RadioGroupNative>
  );
}

/** {@link RadioFieldChoice} の props。 */
type RadioFieldChoiceProps<TValue extends string> = {
  /** 選ばれているか。 */
  readonly checked: boolean;
  /** radio の id。label がこれを指す。 */
  readonly id: string;
  /** 群が誤りを持つか。 */
  readonly invalid: boolean;
  /** 群が共有する `name`。 */
  readonly name: string;
  /** この選択肢が選ばれたことを伝える。 */
  readonly onChoose: (value: TValue) => void;
  /** 並べる選択肢。 */
  readonly option: AdminRadioOption<TValue>;
};

/**
 * 選択肢 1 つ分の radio と label。
 *
 * @remarks
 * 選ばれた値は、change event の文字列からではなく、この選択肢そのものから渡します。
 *
 * @param props - 選択肢と、その状態・選ばれたときの通知。
 */
function RadioFieldChoice<TValue extends string>({
  checked,
  id,
  invalid,
  name,
  onChoose,
  option,
}: RadioFieldChoiceProps<TValue>) {
  const choose = useCallback(() => onChoose(option.value), [onChoose, option.value]);

  return (
    <Label className="flex items-center gap-2" htmlFor={id}>
      <RadioGroupNativeItem
        aria-invalid={invalid}
        checked={checked}
        id={id}
        name={name}
        onChange={choose}
        value={option.value}
      />
      {option.label}
    </Label>
  );
}
