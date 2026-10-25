"use client";

import { FieldGroup } from "@/components/design-system/form/field/field";
import type { Prefecture } from "@/model/user/user";

import { PROFILE_FIELD_LABELS } from "../../../field-labels";
import { PostalCodeField } from "../../../ui/postal-code-field/postal-code-field";
import { PrefectureField } from "../../../ui/prefecture-field/prefecture-field";
import { TextField } from "../../../ui/text-field/text-field";
import type { AddressField } from "../../../use-address-field";
import type { ProfileFields } from "../../../use-profile-fields";

/** {@link RegistrationAddressSection} の props。 */
export type RegistrationAddressSectionProps = {
  /** 入力欄 1 つぶんの props を組む口。 */
  readonly fields: ProfileFields;
  /** 郵便番号からの補完。送信のときに打ち切れるよう、フォームを持つ側が作る。 */
  readonly address: AddressField;
  /** 選べる都道府県。 */
  readonly prefectures: readonly Prefecture[];
};

/**
 * 届け先の住所。
 *
 * @remarks
 * **自分が段であることを知りません。** 表示・非表示と focus の移動は、これを並べる器が持ちます。
 *
 * **郵便番号からの補完をここが配線します。** 補完そのものはフォームを持つ側が作って渡します。
 * 送信した時点で取得中の補完を打ち切るためです。埋める値の決め方は `useAddressField` が持ちます。
 *
 * 補完が起きたことを読み上げます。入力欄の値が変わるだけでは、そこを見ていない利用者に届きません。
 *
 * @param props - 入力欄の props を組む口、郵便番号からの補完、選べる都道府県。
 */
export function RegistrationAddressSection({
  address,
  fields,
  prefectures,
}: RegistrationAddressSectionProps) {
  const postalCode = fields.fieldOf("postalCode");

  return (
    <FieldGroup>
      <p className="text-sm text-muted-foreground" role="status">
        {address.message}
      </p>
      <PostalCodeField
        controlId={postalCode.controlId}
        message={postalCode.message}
        onSearch={address.onSearch}
        registration={address.registration}
        required={postalCode.required}
        searching={address.searching}
        unavailable={address.unavailable}
      />
      <PrefectureField prefectures={prefectures} {...fields.fieldOf("prefecture")} />
      <TextField
        autoComplete="address-level2"
        label={PROFILE_FIELD_LABELS.city}
        {...fields.fieldOf("city")}
      />
      <TextField
        autoComplete="address-line1"
        label={PROFILE_FIELD_LABELS.street}
        {...fields.fieldOf("street")}
      />
      <TextField
        autoComplete="address-line2"
        label={PROFILE_FIELD_LABELS.building}
        {...fields.fieldOf("building")}
      />
    </FieldGroup>
  );
}
