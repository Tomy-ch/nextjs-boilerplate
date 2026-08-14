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
 * `TextField` と同じ理由で切り出してあります。**入力欄の ARIA 属性を与えるのはここ**で、
 * `FormField` は children を受け取る形なので入力欄へ触れず、呼び出し側で毎回書くと付け忘れが
 * 起きます。入力欄が `Input` ではなく `InputGroup` になるだけで、配線の規則は変わりません。
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
          aria-describedby={message === undefined ? undefined : errorId}
          aria-invalid={message !== undefined}
          aria-required={required}
          autoComplete="postal-code"
          id={controlId}
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
