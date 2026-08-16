"use client";

import { useCallback } from "react";

import { SearchFieldClient } from "@/components/design-system/form/search-field-client/search-field-client";
import { SEARCH_FIELD_COMMIT } from "@/components/design-system/form/search-field-client/search-field-client.definition";

import { FILTER_KEY, type ProductListSelection } from "../../../facade/list-url/list-url";
import { useProductFilterDraft } from "../../filter-draft";

/** `ProductKeywordField` の props。 */
export type ProductKeywordFieldProps = {
  /** いま一覧に効いている条件。押しても結果が変わらないかの判断に使う。 */
  selection: ProductListSelection;
};

/** 条件 1 つを、単一の文字列として読む。複数回現れた場合は条件として読めないため空として扱う。 */
function toText(selection: ProductListSelection, key: string): string {
  const value = selection[key];

  return typeof value === "string" ? value : "";
}

/**
 * キーワードの入力欄。
 *
 * @remarks
 * **打鍵では検索しません。** 検索語だけが先に効くと、絞り込みを組んでいる途中で一覧が入れ替わり、
 * 中途半端な条件の結果を見ることになります。
 *
 * **入力の保持を画面の下書きに預けます。** 検索語は絞り込みと同じ 1 つの条件の一部で、どちらの
 * 確定操作からも同じものが飛びます。入力欄が自分で保持すると、絞り込み側から確定したときに
 * 打ち込んだ検索語が置き去りになります。
 *
 * **空のまま押せるのは、いま検索語が効いているときだけです。** 効いている検索語を消すには空の
 * 送信が要る一方、何も効いていない状態での送信は結果が変わりません。押しても何も起きない操作を
 * 残すと、反応が無いのか結果が同じなのかを利用者から区別できません。
 */
export function ProductKeywordField({ selection }: ProductKeywordFieldProps) {
  const { draft, change, apply } = useProductFilterDraft();

  const setKeyword = useCallback(
    (value: string) => {
      change({ ...draft, [FILTER_KEY.KEYWORD]: value });
    },
    [change, draft],
  );

  const keyword = toText(draft, FILTER_KEY.KEYWORD);

  return (
    <SearchFieldClient
      className="max-w-xs flex-1"
      commit={SEARCH_FIELD_COMMIT.SUBMIT}
      label="商品名で探す"
      onSearch={apply}
      onValueChange={setKeyword}
      placeholder="商品名で探す"
      submitDisabled={keyword === "" && toText(selection, FILTER_KEY.KEYWORD) === ""}
      value={keyword}
    />
  );
}
