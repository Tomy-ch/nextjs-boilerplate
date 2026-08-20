import type { ProfileField, ProfileInput } from "@/model/user/profile-schema";
import { profileSchema } from "@/model/user/profile-schema";

/**
 * まだ送れない項目を、渡された並びのまま返す。
 *
 * @remarks
 * 判定は入力欄と同じ表示検証スキーマで行います。条件を書き写すと、規則を変えたときに入力欄と
 * 確認で言うことが割れます（[0062](../../../../docs/adr/0062-form-input-validation.md)）。
 *
 * 未入力と誤りを分けません。**送れないことに変わりが無い**ためで、どう誤っているかは入力欄の
 * 側がその場で言います。
 *
 * 並びは呼び出し側が決めます。利用者が読むのは入力欄と同じ順に並んだ一覧で、判定の側が順序を
 * 持つと、表示の都合がここへ入り込みます。
 *
 * @param values - 入力中の値。触れていない項目は欠けている
 * @param fields - 調べる項目と、返す並び
 */
export function incompleteFields(
  values: Partial<ProfileInput>,
  fields: readonly ProfileField[],
): readonly ProfileField[] {
  return fields.filter(
    (field) => !profileSchema.shape[field].safeParse(values[field] ?? "").success,
  );
}
