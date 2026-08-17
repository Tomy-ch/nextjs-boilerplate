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
  /** 一覧に効いている条件と違うか。 */
  readonly dirty: boolean;
  /** 反映の取得が終わっていないか。 */
  readonly pending: boolean;
  /** 条件を差し替える。 */
  readonly change: (next: ProductListSelection) => void;
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
 * **選んだ時点では一覧を取り直しません。** 条件を 1 つ変えるたびに取得が走ると、3 つ選ぶ間に
 * 捨てられる取得が 2 回起きます。値の範囲を選ぶ操作ではその比ではありません。
 *
 * **確定の操作が複数あっても、確定するものは 1 つでなければなりません。** キーワードの入力欄と
 * 絞り込みの入力欄は画面の別の場所にあり、幅によって後者は脇にも overlay にも現れます。下書きを
 * それぞれが持つと、片方で確定したときにもう片方の入力途中が捨てられます。
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

  const change = useCallback((next: ProductListSelection) => {
    setDraft(next);
  }, []);

  const clear = useCallback(() => {
    setDraft((current) => ({
      ...current,
      ...Object.fromEntries(FIELD_KEYS.map((key) => [key, ""])),
    }));
  }, []);

  const apply = useCallback(() => {
    startTransition(() => {
      router.push(toProductListHref(draft));
    });
  }, [draft, router]);

  return (
    <FilterDraftContext
      value={{
        draft,
        dirty: toProductListHref(draft) !== appliedHref,
        pending,
        change,
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
 * @throws 供給の外で呼んだとき。下書きを持たない場所で条件を変えると、確定しても何も起きません
 */
export function useProductFilterDraft(): FilterDraft {
  const draft = use(FilterDraftContext);

  if (draft === null) {
    throw new Error("ProductFilterDraftProvider の外で下書きを読もうとしました");
  }

  return draft;
}
