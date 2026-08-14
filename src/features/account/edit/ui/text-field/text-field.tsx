"use client";

import type { InputProps } from "@/components/design-system/form/input/input";
import { Input } from "@/components/design-system/form/input/input";
import { FormField } from "@/components/patterns/form-field/form-field";

import type { ProfileFieldProps } from "../../use-profile-fields";

type TextFieldProps = Pick<InputProps, "autoComplete" | "inputMode" | "placeholder" | "type"> &
  ProfileFieldProps & {
    readonly label: string;
  };

/**
 * 1 行入力の項目。
 *
 * @remarks
 * `useProfileFields` が組んだ props を、そのまま `FormField` と `Input` へ配ります。**入力欄の
 * ARIA 属性を与えるのはここ**です。`FormField` は children を受け取る形なので入力欄へ触れず、
 * かといって呼び出し側で毎回書くと、項目が増えるたびに `aria-invalid` の付け忘れが起きます。
 */
export function TextField({
  controlId,
  errorId,
  label,
  message,
  registration,
  required,
  ...input
}: TextFieldProps) {
  return (
    <FormField
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
    </FormField>
  );
}
