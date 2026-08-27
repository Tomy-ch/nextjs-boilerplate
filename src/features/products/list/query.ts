import { z } from "zod";

import { type RawSearchParams, repeatedValues } from "@/model/search-params";

import { MULTI_VALUE_KEYS, type ProductListSelection } from "../facade/list-url/list-url";

/**
 * 選択肢 1 件。
 *
 * @remarks
 * 「すべて」を空文字の値で表します。選択肢の側が指定なしを持てば、操作は値を差し替えるだけで
 * 済み、キーを消す分岐を UI が持たずに済みます。
 */
export type FilterOption = {
  readonly value: string;
  readonly label: string;
};

/** 条件 1 つに載っている値。空は落とし、残りの件数で単一か並びかが決まる。 */
const valuesSchema = repeatedValues(z.array(z.string())).catch([]);

/**
 * 素の `searchParams` を、条件として読める形へ均す。
 *
 * @remarks
 * 同じキーが複数回現れたときの扱いは、その条件が複数の値を受け取れるかで変わります。受け取れる
 * 条件（{@link MULTI_VALUE_KEYS}）は並びのまま残します。先頭だけを採ると、選んだうちの 1 つしか
 * 効きません。
 *
 * **受け取れない条件は、指定なしとして落とします。** どれを採るかを条件ごとに決めると、同じ URL が
 * 画面の場所によって違う条件に見えます。契約が単一の値しか宣言していない条件へ並びを渡すと取得
 * そのものが弾かれるため、一覧全体が「条件が正しくない」表示に変わってしまいます。
 *
 * 空白を落として空を捨てるのは読み取りの規則が持ちます（`model/search-params.ts`）。入力欄を空にして
 * 送った form は `?keyword=` を URL に残すため、これを不正な入力と扱うと、消しただけで検索できなく
 * なります。
 */
export function normalizeSearchParams(params: RawSearchParams): ProductListSelection {
  const normalized: Record<string, string | readonly string[]> = {};

  for (const [key, value] of Object.entries(params)) {
    const values = valuesSchema.parse(value);
    const [single] = values;

    if (single === undefined) {
      continue;
    }

    if (values.length === 1) {
      normalized[key] = single;
    } else if (MULTI_VALUE_KEYS.includes(key)) {
      normalized[key] = values;
    }
  }

  return normalized;
}
