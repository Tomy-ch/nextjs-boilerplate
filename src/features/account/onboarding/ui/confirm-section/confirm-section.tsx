"use client";

import type { Control } from "react-hook-form";
import { useWatch } from "react-hook-form";

import {
  KeyValueEmpty,
  KeyValueItem,
  KeyValueLabel,
  KeyValueList,
  KeyValueValue,
} from "@/components/design-system/display/key-value-list/key-value-list";
import type { ProfileInput } from "@/model/user/profile-schema";

import { PROFILE_FIELD_LABELS } from "../../../field-labels";
import { REGISTRATION_FIELDS } from "../../steps";

/** {@link RegistrationConfirmSection} の props。 */
export type RegistrationConfirmSectionProps = {
  /** 入力中の値を購読するための control。 */
  readonly control: Control<ProfileInput>;
};

/**
 * 送る前に、入力した内容を読み返すための一覧。
 *
 * @remarks
 * **入力欄を持ちません。** 送ろうとしている値をそのまま読み返す場所で、直すのは前の段へ戻って
 * 行います。欠けの判定もここは持ちません —— 埋まっていない段からは進めないため、この段に着いた
 * 時点で必須の項目は揃っています。
 *
 * 値は購読して読みます。段の行き来はこの部品の外で起きるため、組み立て時の値を写して持つと、
 * 前の段で直した内容が確認に反映されません。購読するのはこの部品だけで、入力のたびにフォーム
 * 全体を描き直しません。
 */
export function RegistrationConfirmSection({ control }: RegistrationConfirmSectionProps) {
  const values = useWatch({ control });

  return (
    <KeyValueList>
      {REGISTRATION_FIELDS.map((field) => (
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
  );
}
