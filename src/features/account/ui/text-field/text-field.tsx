"use client";

import type { InputProps } from "@/components/design-system/form/input/input";
import { Input } from "@/components/design-system/form/input/input";
import { FormField } from "@/components/patterns/form-field/form-field";
import type { ProfileFieldProps } from "../../use-profile-fields";

type TextFieldProps = Pick<InputProps, "autoComplete" | "inputMode" | "placeholder" | "type"> &
  ProfileFieldProps & {
    readonly label: string;
    /** 入力の補足。誤りとは別に常時出す。 */
    readonly description?: string;
  };

/**
 * 1 行入力の項目。
 *
 * @remarks
 * `useProfileFields` が組んだ props を、そのまま `FormField` と `Input` へ配ります。
 */
export function TextField({
  controlId,
  description,
  label,
  message,
  registration,
  required,
  ...input
}: TextFieldProps) {
  return (
    <FormField
      controlId={controlId}
      description={description}
      label={label}
      message={message}
      required={required}
    >
      {(control) => <Input {...control} {...input} {...registration} />}
    </FormField>
  );
}
