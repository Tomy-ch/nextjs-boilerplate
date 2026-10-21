"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import {
  type AdminProductListConditions,
  type DiscontinuedFilter,
  toConditionHref,
} from "../../query";
import { AdminProductDiscontinuedControl } from "../discontinued-control/discontinued-control";

/** `AdminProductDiscontinuedSelect` の props。 */
export type AdminProductDiscontinuedSelectProps = {
  /** いま効いている条件。選んだ先の URL を組むのに要る。 */
  conditions: AdminProductListConditions;
};

/**
 * 選んだ時点で反映する、廃番での絞り込み。脇に畳まず常に見えている幅で使う。
 *
 * @remarks
 * 排他の 1 つを選ぶ欄で、結果が同じ画面にそのまま出るため、確定を待たせません。選び直すと
 * 読み進めた位置を捨てます。
 *
 * @param props - {@link AdminProductDiscontinuedSelectProps} を参照。
 *
 * @see Storybook `Features/Admin/Products/List/DiscontinuedSelect`
 */
export function AdminProductDiscontinuedSelect({
  conditions,
}: AdminProductDiscontinuedSelectProps) {
  const router = useRouter();
  const select = useCallback(
    (discontinued: DiscontinuedFilter) => {
      router.push(toConditionHref({ ...conditions, discontinued }));
    },
    [conditions, router],
  );

  return <AdminProductDiscontinuedControl onSelect={select} value={conditions.discontinued} />;
}
