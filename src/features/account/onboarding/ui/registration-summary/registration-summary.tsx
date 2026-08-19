"use client";

import type { Control } from "react-hook-form";
import { useWatch } from "react-hook-form";

import { FormFeedback } from "@/components/app-starter/form-feedback/form-feedback";
import {
  KeyValueItem,
  KeyValueLabel,
  KeyValueList,
  KeyValueValue,
} from "@/components/design-system/display/key-value-list/key-value-list";
import type { ProfileField, ProfileInput } from "@/model/user/profile-schema";
import { profileSchema } from "@/model/user/profile-schema";

import { PROFILE_FIELD_LABELS } from "../../../field-labels";

/** 確認に並べる順序。入力欄の並びと揃える。 */
const SUMMARY_FIELDS: readonly ProfileField[] = [
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

/** 値が空の項目に出す文言。 */
const EMPTY_VALUE = "未入力";

/** 空欄を、読んで意味の通る文言へ置き換える。 */
function toDisplayValue(value: string | undefined): string {
  return value === undefined || value === "" ? EMPTY_VALUE : value;
}

type RegistrationSummaryProps = {
  /** 入力中の値を購読するための control。 */
  readonly control: Control<ProfileInput>;
};

/**
 * 送る前に、入力した内容を読み返すための一覧。
 *
 * @remarks
 * **この段階が入力の欠けを引き受けます。** 前の段階へ進む操作を塞がない代わりに、ここで足りない
 * 項目を名指しします。塞ぐ側に倒すと、理由を言わないまま押せない button が残ります
 * （[0062](../../../../../../docs/adr/0062-form-input-validation.md)）。
 *
 * 判定は入力欄と同じ表示検証スキーマで行います。ここに条件を書き写すと、規則を変えたときに
 * 入力欄と確認で言うことが割れます。
 *
 * 値は購読して読みます。段階の行き来はこの部品の外で起きるため、組み立て時の値を写して持つと、
 * 前の段階で直した内容が確認に反映されません。購読するのはこの部品だけで、入力のたびに
 * フォーム全体を描き直しません。
 */
export function RegistrationSummary({ control }: RegistrationSummaryProps) {
  const values = useWatch({ control });
  const incomplete = SUMMARY_FIELDS.filter(
    (field) => !profileSchema.shape[field].safeParse(values[field] ?? "").success,
  );

  return (
    <div className="flex flex-col gap-6">
      {incomplete.length === 0 ? null : (
        <FormFeedback
          description={
            <>
              <p>前の段階へ戻って、次の項目を入力してください。</p>
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
        {SUMMARY_FIELDS.map((field) => (
          <KeyValueItem key={field}>
            <KeyValueLabel>{PROFILE_FIELD_LABELS[field]}</KeyValueLabel>
            <KeyValueValue>{toDisplayValue(values[field])}</KeyValueValue>
          </KeyValueItem>
        ))}
      </KeyValueList>
    </div>
  );
}
