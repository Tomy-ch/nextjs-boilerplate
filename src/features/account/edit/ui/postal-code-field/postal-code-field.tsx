"use client";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/design-system/form/input-group/input-group";
import {
  INPUT_GROUP_ADDON_ALIGN,
  INPUT_GROUP_BUTTON_SIZE,
} from "@/components/design-system/form/input-group/input-group.definition";
import { fieldControlAttributes } from "@/components/patterns/form-field/field-attributes";
import { FormField } from "@/components/patterns/form-field/form-field";
import type { AddressField } from "../../use-address-field";
import type { ProfileFieldProps } from "../../use-profile-fields";

type PostalCodeFieldProps = Pick<
  ProfileFieldProps,
  "controlId" | "errorId" | "message" | "required"
> &
  Pick<AddressField, "onSearch" | "registration" | "searching">;

/**
 * 郵便番号の項目。住所を検索する操作を枠の中に持つ。
 *
 * @remarks
 * 入力欄が `Input` ではなく `InputGroup` になるだけで、`TextField` と配線の規則は変わりません。
 * 与える属性は `fieldControlAttributes` が組みます。
 *
 * 操作を枠の中へ収めるのは、いつ補完が走るのかを利用者が決められるようにしつつ、どの入力に
 * 属する操作かを離さないためです。
 */
export function PostalCodeField({
  controlId,
  errorId,
  message,
  onSearch,
  registration,
  required,
  searching,
}: PostalCodeFieldProps) {
  return (
    <FormField
      controlId={controlId}
      errorId={errorId}
      label="郵便番号"
      message={message}
      required={required}
    >
      <InputGroup className="sm:max-w-sm">
        <InputGroupInput
          {...fieldControlAttributes({ controlId, errorId, message, required })}
          autoComplete="postal-code"
          inputMode="numeric"
          placeholder="150-0001"
          {...registration}
        />
        <InputGroupAddon align={INPUT_GROUP_ADDON_ALIGN.INLINE_END}>
          <InputGroupButton
            disabled={searching}
            onClick={onSearch}
            size={INPUT_GROUP_BUTTON_SIZE.SMALL}
            type="button"
          >
            住所を検索
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </FormField>
  );
}
