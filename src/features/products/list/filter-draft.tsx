"use client";

import { useRouter } from "next/navigation";
import { createContext, type ReactNode, use, useCallback, useState, useTransition } from "react";

import {
  FILTER_KEY,
  type ProductListSelection,
  toProductListHref,
} from "../facade/list-url/list-url";

/** 入力欄が受け持つ条件のキー。まとめて外す操作はこれだけを外す。 */
const FIELD_KEYS: readonly string[] = [
  FILTER_KEY.CATEGORY,
  FILTER_KEY.MIN_PRICE,
  FILTER_KEY.MAX_PRICE,
  FILTER_KEY.MIN_QUANTITY,
  FILTER_KEY.MAX_QUANTITY,
];

/** 組み立て中の条件と、それを一覧へ反映する手段。 */
export type FilterDraft = {
  /** いま組み立てている条件。 */
  readonly draft: ProductListSelection;
  /** 反映の取得が終わっていないか。 */
  readonly pending: boolean;
  /** 条件を差し替える。一覧はまだ変わらない。 */
  readonly change: (next: ProductListSelection) => void;
  /** 条件を差し替え、そのまま一覧へ反映する。 */
  readonly commit: (next: ProductListSelection) => void;
  /** 入力欄が受け持つ条件をすべて外す。 */
  readonly clear: () => void;
  /** 組み立てた条件を一覧へ反映する。 */
  readonly apply: () => void;
};

const FilterDraftContext = createContext<FilterDraft | null>(null);

/** `ProductFilterDraftProvider` の props。 */
export type ProductFilterDraftProviderProps = {
  /** いま一覧に効いている条件。 */
  selection: ProductListSelection;
  /** 下書きを読む側を含む部分木。 */
  children: ReactNode;
};

/**
 * 組み立て中の条件を持ち、画面で 1 つに保つ。
 *
 * @remarks
 * **反映の契機を 2 つ持ちます。** 選んだ時点で反映する形と、組み立ててからまとめて反映する形の
 * どちらを使うかは、置く側が決めます。一覧を見ながら選べる幅では前者、一覧が overlay に隠れる
 * 幅では後者になります（[画面要件](../../../../docs/spec/route/shop/products/page.screen.md)）。
 *
 * **下書きをそれぞれの入力欄が持つと、片方で確定したときにもう片方の入力途中が捨てられます。**
 * 確定の操作が画面のどこに何個あるかは画面が決めます
 * （[README](../README.md) / [画面要件](../../../../docs/spec/route/shop/products/page.screen.md)）。
 *
 * 反映を `useTransition` で包むのは、取得が終わるまで前の一覧を残すためです。包まないと押した
 * 瞬間に一覧が待機表示へ落ち、続けて絞り込む操作の足場が消えます。
 *
 * 一覧に効いている条件が外から変わったら、下書きを捨ててそちらへ揃えます。条件の chip を外す
 * 操作や戻る操作は入力欄を通らないため、揃えないと画面の一覧と入力欄が違うものを指します。
 * 揃える判断を描画の中で行うのは、描画のあとで直すと一度古い姿が出てしまうためです。
 */
export function ProductFilterDraftProvider({
  selection,
  children,
}: ProductFilterDraftProviderProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const appliedHref = toProductListHref(selection);
  const [knownHref, setKnownHref] = useState(appliedHref);
  const [draft, setDraft] = useState(selection);

  if (knownHref !== appliedHref) {
    setKnownHref(appliedHref);
    setDraft(selection);
  }

  const navigate = useCallback(
    (next: ProductListSelection) => {
      startTransition(() => {
        router.push(toProductListHref(next));
      });
    },
    [router],
  );

  const change = useCallback((next: ProductListSelection) => {
    setDraft(next);
  }, []);

  const commit = useCallback(
    (next: ProductListSelection) => {
      setDraft(next);
      navigate(next);
    },
    [navigate],
  );

  const clear = useCallback(() => {
    setDraft((current) => ({
      ...current,
      ...Object.fromEntries(FIELD_KEYS.map((key) => [key, ""])),
    }));
  }, []);

  const apply = useCallback(() => {
    navigate(draft);
  }, [draft, navigate]);

  return (
    <FilterDraftContext
      value={{
        draft,
        pending,
        change,
        commit,
        clear,
        apply,
      }}
    >
      {children}
    </FilterDraftContext>
  );
}

/**
 * 組み立て中の条件を読む。
 *
 * @remarks
 * 供給の外では既定値を返さず、その場で失敗させます。返してしまうと、条件を変えても確定が何も
 * 起こさない画面ができ、壊れていることが誰の目にも見えません。
 *
 * @throws {Error} {@link ProductFilterDraftProvider} の外で呼んだとき
 */
export function useProductFilterDraft(): FilterDraft {
  const draft = use(FilterDraftContext);

  if (draft === null) {
    throw new Error("ProductFilterDraftProvider の外で下書きを読もうとしました");
  }

  return draft;
}
