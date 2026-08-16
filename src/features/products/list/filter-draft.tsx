"use client";

import { createContext, type ReactNode, use } from "react";

import type { ProductListSelection } from "../facade/list-url/list-url";
import { type FilterDraft, useFilterDraft } from "./use-filter-draft";

const FilterDraftContext = createContext<FilterDraft | null>(null);

/** `ProductFilterDraftProvider` の props。 */
export type ProductFilterDraftProviderProps = {
  /** いま一覧に効いている条件。 */
  selection: ProductListSelection;
  /** 下書きを読む側を含む部分木。 */
  children: ReactNode;
};

/**
 * 組み立て中の条件を、画面で 1 つに保つ。
 *
 * @remarks
 * **確定の操作が複数あっても、確定するものは 1 つでなければなりません。** キーワードの入力欄と
 * 絞り込みの入力欄は画面の別の場所にあり、幅によって後者は脇にも overlay にも現れます。下書きを
 * それぞれが持つと、片方で確定したときにもう片方の入力途中が捨てられます。
 *
 * 供給を別にしてあるのは、下書きの中身（{@link useFilterDraft}）と、それを画面のどこまでへ配るかが
 * 別々に変わるためです。
 */
export function ProductFilterDraftProvider({
  selection,
  children,
}: ProductFilterDraftProviderProps) {
  const draft = useFilterDraft(selection);

  return <FilterDraftContext value={draft}>{children}</FilterDraftContext>;
}

/**
 * 組み立て中の条件を読む。
 *
 * @throws 供給の外で呼んだとき。下書きを持たない場所で条件を変えると、確定しても何も起きません
 */
export function useProductFilterDraft(): FilterDraft {
  const draft = use(FilterDraftContext);

  if (draft === null) {
    throw new Error("ProductFilterDraftProvider の外で下書きを読もうとしました");
  }

  return draft;
}
