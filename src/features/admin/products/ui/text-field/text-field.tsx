"use client";

import { useCallback } from "react";

import type { InputProps } from "@/components/design-system/form/input/input";
import { Input } from "@/components/design-system/form/input/input";
import { FormField } from "@/components/patterns/form-field/form-field";

/** `ProductTextField` の props。 */
export type ProductTextFieldProps = Pick<
  InputProps,
  "inputMode" | "max" | "min" | "placeholder" | "step" | "type"
> & {
  /** 入力欄の `id`。誤りの文言の `id` はここから導く。 */
  controlId: string;
  /** 送信時の名前。 */
  name: string;
  /** 項目の名前。 */
  label: string;
  /** 今の値。 */
  value: string;
  /** 値が変わったことを伝える。 */
  onValueChange: (value: string) => void;
  /** 入力欄から focus が外れたことを伝える。 */
  onLeave: () => void;
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
 * **値は呼び出し元が持ちます。**入力欄に任せると、送信が終わった時点で入力欄が元へ戻り、弾かれた
 * 送信のあとに書いた内容が消えます。
 *
 * 入力欄へ与える a11y 属性は `fieldControlAttributes` が組みます。項目ごとに書き写すと、項目が
 * 増えたときに付け忘れが起きます。
 */
export function ProductTextField({
  controlId,
  description,
  label,
  message,
  name,
  onLeave,
  onValueChange,
  required,
  value,
  ...input
}: ProductTextFieldProps) {
  const change = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => onValueChange(event.target.value),
    [onValueChange],
  );

  return (
    <FormField
      controlId={controlId}
      description={description}
      label={label}
      message={message}
      required={required}
    >
      {(control) => (
        <Input
          {...control}
          {...input}
          name={name}
          onBlur={onLeave}
          onChange={change}
          value={value}
        />
      )}
    </FormField>
  );
}
