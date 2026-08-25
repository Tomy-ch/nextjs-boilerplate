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

type PostalCodeFieldProps = Pick<ProfileFieldProps, "controlId" | "message" | "required"> &
  Pick<AddressField, "onSearch" | "registration" | "searching" | "unavailable">;

/**
 * 郵便番号の項目。住所を検索する操作を枠の中に持つ。
 *
 * @remarks
 * 入力欄が `Input` ではなく `InputGroup` になるだけで、`TextField` と配線の規則は変わりません。
 *
 * 操作を枠の中へ収めるのは、いつ補完が走るのかを利用者が決められるようにしつつ、どの入力に
 * 属する操作かを離さないためです。
 *
 * 補完の機構が使えないと判ったら操作を閉じます。押しても永久に何も起きない操作を残すと、
 * 利用者は自分の入力した郵便番号を疑って何度も試します。手入力へ促す文言は呼び出し側の
 * 読み上げ領域が出します。
 */
export function PostalCodeField({
  controlId,
  message,
  onSearch,
  registration,
  required,
  searching,
  unavailable,
}: PostalCodeFieldProps) {
  return (
    <FormField controlId={controlId} label="郵便番号" message={message} required={required}>
      {(control) => (
        <InputGroup className="sm:max-w-sm">
          <InputGroupInput
            {...control}
            autoComplete="postal-code"
            inputMode="numeric"
            placeholder="150-0001"
            {...registration}
          />
          <InputGroupAddon align={INPUT_GROUP_ADDON_ALIGN.INLINE_END}>
            <InputGroupButton
              disabled={searching || unavailable}
              onClick={onSearch}
              size={INPUT_GROUP_BUTTON_SIZE.SMALL}
              type="button"
            >
              住所を検索
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      )}
    </FormField>
  );
}
