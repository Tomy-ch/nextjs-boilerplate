"use client";

import { FieldGroup } from "@/components/design-system/form/field/field";

import { PROFILE_FIELD_LABELS } from "../../../field-labels";
import { TextField } from "../../../ui/text-field/text-field";
import type { ProfileFields } from "../../../use-profile-fields";

/** {@link RegistrationBasicsSection} の props。 */
export type RegistrationBasicsSectionProps = {
  /** 入力欄 1 つぶんの props を組む口。 */
  readonly fields: ProfileFields;
};

/**
 * 名前と連絡先。
 *
 * @remarks
 * **自分が段であることを知りません。** 表示・非表示と focus の移動は、これを並べる器が持ちます。
 * 知ってしまうと器を差し替えられなくなります。
 *
 * 名字と名前だけを横に並べます。どちらも短く、続けて 1 つの氏名として読むためです。連絡先は
 * 値の長さが揃わないので 1 列に落とします。
 */
export function RegistrationBasicsSection({ fields }: RegistrationBasicsSectionProps) {
  return (
    <FieldGroup>
      <div className="grid gap-6 sm:grid-cols-2">
        <TextField
          autoComplete="family-name"
          label={PROFILE_FIELD_LABELS.lastName}
          {...fields.fieldOf("lastName")}
        />
        <TextField
          autoComplete="given-name"
          label={PROFILE_FIELD_LABELS.firstName}
          {...fields.fieldOf("firstName")}
        />
      </div>
      <TextField
        autoComplete="email"
        label={PROFILE_FIELD_LABELS.email}
        type="email"
        {...fields.fieldOf("email")}
      />
      <TextField
        autoComplete="tel"
        inputMode="tel"
        label={PROFILE_FIELD_LABELS.phone}
        type="tel"
        {...fields.fieldOf("phone")}
      />
    </FieldGroup>
  );
}
