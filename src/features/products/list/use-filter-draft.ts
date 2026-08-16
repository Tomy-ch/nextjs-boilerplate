"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

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

/**
 * 絞り込みの下書きを持つ。
 *
 * @remarks
 * **選んだ時点では一覧を取り直しません。** 条件を 1 つ変えるたびに取得が走ると、3 つ選ぶ間に
 * 捨てられる取得が 2 回起きます。値の範囲を選ぶ操作ではその比ではありません。
 *
 * 反映を `useTransition` で包むのは、取得が終わるまで前の一覧を残すためです。包まないと押した
 * 瞬間に一覧が待機表示へ落ち、続けて絞り込む操作の足場が消えます。
 *
 * 一覧に効いている条件が外から変わったら、下書きを捨ててそちらへ揃えます。条件の chip を外す
 * 操作や戻る操作は入力欄を通らないため、揃えないと画面の一覧と入力欄が違うものを指します。
 * 揃える判断を描画の中で行うのは、描画のあとで直すと一度古い姿が出てしまうためです。
 *
 * @param selection - いま一覧に効いている条件
 */
export function useFilterDraft(selection: ProductListSelection): FilterDraft {
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

  return {
    draft,
    dirty: toProductListHref(draft) !== appliedHref,
    pending,
    change,
    clear,
    apply,
  };
}
