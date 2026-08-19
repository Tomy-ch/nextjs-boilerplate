"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import type { AdminProductFilterOption } from "../../filter-option";
import { type AdminProductListConditions, toConditionHref } from "../../query";
import { AdminProductFilterControl } from "../filter-control/filter-control";

/** 差し替えられる絞り込みの項目。 */
export type AdminProductFilterField = "categoryCode" | "statusCode";

/** `AdminProductFilterSelect` の props。 */
export type AdminProductFilterSelectProps = {
  /** どの条件を差し替えるか。 */
  field: AdminProductFilterField;
  /** 何で絞り込む欄かを示す文言。 */
  label: string;
  /** 選べる候補。先頭に「すべて」を含めて渡す。 */
  options: readonly AdminProductFilterOption[];
  /** いま効いている条件。選んだ先の URL を組むのに要る。 */
  conditions: AdminProductListConditions;
};

/**
 * 選んだ時点で反映する絞り込み。脇に畳まず常に見えている幅で使う。
 *
 * @remarks
 * **選んだ時点で反映します。** 単一選択なので選ぶことが確定と同じであり、別に確定の操作を置くと
 * 1 つ選ぶのに 2 段かかります。選んだ結果が同じ画面にそのまま出るため、確定を待たせる理由も
 * ありません。overlay の中では結果が隠れるので、そちらはまとめて確定します。
 *
 * 選び直すと読み進めた位置を捨てます。前の条件の途中の位置は、新しい条件では別の場所を指します。
 *
 * @see Storybook `Page/Admin/Products/List`
 */
export function AdminProductFilterSelect({
  field,
  label,
  options,
  conditions,
}: AdminProductFilterSelectProps) {
  const router = useRouter();
  const select = useCallback(
    (value: string) => {
      router.push(toConditionHref({ ...conditions, [field]: value }));
    },
    [conditions, field, router],
  );

  return (
    <AdminProductFilterControl
      label={label}
      onSelect={select}
      options={options}
      value={conditions[field]}
    />
  );
}
