"use client";

import type { Control } from "react-hook-form";
import { useWatch } from "react-hook-form";

import { FormFeedback } from "@/components/app-starter/form-feedback/form-feedback";
import {
  KeyValueEmpty,
  KeyValueItem,
  KeyValueLabel,
  KeyValueList,
  KeyValueValue,
} from "@/components/design-system/display/key-value-list/key-value-list";
import type { ProfileField, ProfileInput } from "@/model/user/profile-schema";

import { PROFILE_FIELD_LABELS } from "../../../field-labels";
import { incompleteFields } from "../../incomplete-fields";

/** 確認に並べる順序。入力欄の並びと揃える。 */
const CONFIRM_FIELDS: readonly ProfileField[] = [
  "lastName",
  "firstName",
  "email",
  "phone",
  "postalCode",
  "prefecture",
  "city",
  "street",
  "building",
];

/** {@link RegistrationConfirmSection} の props。 */
export type RegistrationConfirmSectionProps = {
  /** 入力中の値を購読するための control。 */
  readonly control: Control<ProfileInput>;
};

/**
 * 送る前に、入力した内容を読み返すための一覧。
 *
 * @remarks
 * **この段が入力の欠けを引き受けます。** 前の段へ進む操作を塞がない代わりに、ここで足りない項目を
 * 名指しします。塞ぐ側に倒すと、理由を言わないまま押せない button が残ります
 * （[0062](../../../../../../docs/adr/0062-form-input-validation.md)）。
 *
 * 値は購読して読みます。段の行き来はこの部品の外で起きるため、組み立て時の値を写して持つと、
 * 前の段で直した内容が確認に反映されません。購読するのはこの部品だけで、入力のたびにフォーム
 * 全体を描き直しません。
 */
export function RegistrationConfirmSection({ control }: RegistrationConfirmSectionProps) {
  const values = useWatch({ control });
  const incomplete = incompleteFields(values, CONFIRM_FIELDS);

  return (
    <div className="flex flex-col gap-6">
      {incomplete.length === 0 ? null : (
        <FormFeedback
          description={
            <>
              <p>前の段へ戻って、次の項目を入力してください。</p>
              <ul className="mt-2 flex list-disc flex-col gap-1 ps-5">
                {incomplete.map((field) => (
                  <li key={field}>{PROFILE_FIELD_LABELS[field]}</li>
                ))}
              </ul>
            </>
          }
          title="まだ登録できません"
          variant="warning"
        />
      )}

      <KeyValueList>
        {CONFIRM_FIELDS.map((field) => (
          <KeyValueItem key={field}>
            <KeyValueLabel>{PROFILE_FIELD_LABELS[field]}</KeyValueLabel>
            <KeyValueValue>
              {values[field] === undefined || values[field] === "" ? (
                <KeyValueEmpty>未入力</KeyValueEmpty>
              ) : (
                values[field]
              )}
            </KeyValueValue>
          </KeyValueItem>
        ))}
      </KeyValueList>
    </div>
  );
}
