"use client";

import type { InputProps } from "@/components/design-system/form/input/input";
import { Input } from "@/components/design-system/form/input/input";
import { fieldControlAttributes } from "@/components/patterns/form-field/field-attributes";
import { FormField } from "@/components/patterns/form-field/form-field";

/** 誤りの文言に与える `id`。入力欄の `aria-describedby` が指す。 */
export function toErrorId(controlId: string): string {
  return `${controlId}-error`;
}

/** `ProductTextField` の props。 */
export type ProductTextFieldProps = Pick<
  InputProps,
  "defaultValue" | "inputMode" | "max" | "min" | "placeholder" | "step" | "type"
> & {
  /** 入力欄の `id`。誤りの文言の `id` はここから導く。 */
  controlId: string;
  /** 送信時の名前。 */
  name: string;
  /** 項目の名前。 */
  label: string;
  /** 入力の補足。 */
  description?: string;
  /** 誤りの文言。 */
  message?: string;
  /** 空欄を受け付けない項目か。 */
  required: boolean;
};

/**
 * 1 行入力の項目。
 *
 * @remarks
 * 入力欄へ与える a11y 属性は `fieldControlAttributes` が組みます。項目ごとに書き写すと、項目が
 * 増えたときに付け忘れが起きます。
 */
export function ProductTextField({
  controlId,
  description,
  label,
  message,
  name,
  required,
  ...input
}: ProductTextFieldProps) {
  const errorId = toErrorId(controlId);

  return (
    <FormField
      controlId={controlId}
      description={description}
      errorId={errorId}
      label={label}
      message={message}
      required={required}
    >
      <Input
        {...fieldControlAttributes({ controlId, errorId, message, required })}
        {...input}
        name={name}
      />
    </FormField>
  );
}
