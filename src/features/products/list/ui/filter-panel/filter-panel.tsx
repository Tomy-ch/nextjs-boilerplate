"use client";

import type { ProductListSelection } from "../../../facade/list-url/list-url";
import type { FilterOption } from "../../query";
import { ProductFilterApply } from "../filter-apply/filter-apply";
import { ProductFilterFields } from "../filter-fields/filter-fields";

/** `ProductFilterPanel` の props。 */
export type ProductFilterPanelProps = {
  /** 選べる分類。 */
  categories: readonly FilterOption[];
  /** いま組み立てている条件。 */
  draft: ProductListSelection;
  /** 組み立てた条件に一致する件数。まだ分からなければ省く。 */
  count?: number;
  /** 件数を数えている最中か。 */
  counting?: boolean;
  /** 反映の取得が終わっていないか。 */
  pending?: boolean;
  /** 条件が変わったときに呼ぶ。 */
  onChange: (next: ProductListSelection) => void;
  /** 反映が押されたときに呼ぶ。 */
  onApply: () => void;
};

/**
 * 絞り込みの見た目。入力欄と確定の操作を縦に積む。
 *
 * @remarks
 * 取得も下書きも持ちません。渡されたものを描くだけにしてあるのは、見え方の確認に取得を必要と
 * しないようにするためです。下書きと件数の取得は呼び出し元が持ちます。
 */
export function ProductFilterPanel({
  categories,
  draft,
  count,
  counting,
  pending,
  onChange,
  onApply,
}: ProductFilterPanelProps) {
  return (
    <div className="grid gap-6">
      <ProductFilterFields categories={categories} draft={draft} onChange={onChange} />
      <ProductFilterApply count={count} counting={counting} onApply={onApply} pending={pending} />
    </div>
  );
}
