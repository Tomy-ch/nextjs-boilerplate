"use client";

import { FieldGroup } from "@/components/design-system/form/field/field";
import type { Prefecture } from "@/model/user/user";

import { PROFILE_FIELD_LABELS } from "../../../field-labels";
import { PostalCodeField } from "../../../ui/postal-code-field/postal-code-field";
import { PrefectureField } from "../../../ui/prefecture-field/prefecture-field";
import { TextField } from "../../../ui/text-field/text-field";
import { useAddressField } from "../../../use-address-field";
import type { ProfileFields } from "../../../use-profile-fields";

/** {@link RegistrationAddressSection} の props。 */
export type RegistrationAddressSectionProps = {
  /** 入力欄 1 つぶんの props を組む口。 */
  readonly fields: ProfileFields;
  /** 選べる都道府県。 */
  readonly prefectures: readonly Prefecture[];
};

/**
 * 届け先の住所。
 *
 * @remarks
 * **自分が段であることを知りません。** 表示・非表示と focus の移動は、これを並べる器が持ちます。
 *
 * **郵便番号からの補完をここが配線します。** 補完は住所の項目にしか関わらないので、外側が
 * 知る必要がありません。埋める値の決め方は `useAddressField` が持ちます。
 *
 * 補完が起きたことを読み上げます。入力欄の値が変わるだけでは、そこを見ていない利用者に届きません。
 */
export function RegistrationAddressSection({
  fields,
  prefectures,
}: RegistrationAddressSectionProps) {
  const address = useAddressField(fields);
  const postalCode = fields.fieldOf("postalCode");

  return (
    <FieldGroup>
      {/* 補完は focus が外れた時点でも走る。起きたことを画面の変化だけで伝えると、
          入力欄を見ていない利用者には届かない。 */}
      <p className="text-sm text-muted-foreground" role="status">
        {address.message}
      </p>
      <PostalCodeField
        controlId={postalCode.controlId}
        errorId={postalCode.errorId}
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
