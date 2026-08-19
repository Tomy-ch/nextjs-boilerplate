"use client";

import {
  SelectNative,
  SelectNativeOption,
} from "@/components/design-system/form/select-native/select-native";
import { fieldControlAttributes } from "@/components/patterns/form-field/field-attributes";
import { FormField } from "@/components/patterns/form-field/form-field";

import { toErrorId } from "../text-field/text-field";

/** 選べる候補 1 件。 */
export type ProductSelectOption = {
  readonly value: string;
  readonly label: string;
};

/** `ProductSelectField` の props。 */
export type ProductSelectFieldProps = {
  /** 入力欄の `id`。 */
  controlId: string;
  /** 送信時の名前。 */
  name: string;
  /** 項目の名前。 */
  label: string;
  /** 選べる候補。 */
  options: readonly ProductSelectOption[];
  /** 最初に選ばれている値。 */
  defaultValue?: string;
  /** 誤りの文言。 */
  message?: string;
};

/**
 * 候補から 1 つ選ぶ項目。
 *
 * @remarks
 * native の `select` を使います。候補はマスタから来る静的で少数の一覧で、検索も独自の popup も
 * 要りません。native なら初期表示に client の JavaScript が要らず、選んだ値もそのまま送信に
 * 載ります。
 *
 * 空の候補を先頭へ置くのは、既定で先頭が選ばれたことにしないためです。選ばれていない状態を
 * 表せないと、利用者が確かめずに送った値と、意図して選んだ値が区別できません。
 */
export function ProductSelectField({
  controlId,
  defaultValue,
  label,
  message,
  name,
  options,
}: ProductSelectFieldProps) {
  const errorId = toErrorId(controlId);

  return (
    <FormField
      controlId={controlId}
      errorId={errorId}
      label={label}
      message={message}
      required={true}
    >
      <SelectNative
        {...fieldControlAttributes({ controlId, errorId, message, required: true })}
        className="w-full"
        defaultValue={defaultValue ?? ""}
        name={name}
      >
        <SelectNativeOption value="">選んでください</SelectNativeOption>
        {options.map((option) => (
          <SelectNativeOption key={option.value} value={option.value}>
            {option.label}
          </SelectNativeOption>
        ))}
      </SelectNative>
    </FormField>
  );
}
