"use client";

import { useRouter } from "next/navigation";
import { type ChangeEvent, useCallback, useId, useTransition } from "react";

import { Label } from "@/components/design-system/form/label/label";
import { SelectNative } from "@/components/design-system/form/select-native/select-native";
import {
  FILTER_KEY,
  type ProductListSelection,
  toProductListHref,
  toSelectedValue,
} from "../../../facade/list-url/list-url";
import type { FilterOption } from "../../query";

/** `ProductSortSelect` の props。 */
export type ProductSortSelectProps = {
  /** 選べる並び順。 */
  options: readonly FilterOption[];
  /** いま効いている条件。並び替え以外もそのまま引き継ぐ。 */
  selection: ProductListSelection;
};

/**
 * 一覧の並び替え。
 *
 * @remarks
 * 幅によらず選んだ時点で反映します。単一選択なので、選ぶことが確定することと同じであり、
 * 別に確定の操作を置くと同じ意味の操作が 2 つ並びます。絞り込みが overlay の中でまとめて確定
 * するのとは、この点で扱いが違います。
 *
 * `select` を使うのは、狭い幅で OS の選択 UI に乗るためです。選択肢が増えても画面を覆わず、
 * 支援技術からも既知の操作として扱えます。
 */
export function ProductSortSelect({ options, selection }: ProductSortSelectProps) {
  "use memo";

  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const fieldId = useId();

  const change = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const next = toProductListHref({ ...selection, [FILTER_KEY.SORT]: event.target.value });

      startTransition(() => {
        router.push(next);
      });
    },
    [router, selection],
  );

  return (
    <div className="flex items-center gap-2">
      <Label className="shrink-0" htmlFor={fieldId}>
        並び替え
      </Label>
      <SelectNative
        disabled={pending}
        id={fieldId}
        onChange={change}
        value={toSelectedValue(selection, FILTER_KEY.SORT)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </SelectNative>
    </div>
  );
}
