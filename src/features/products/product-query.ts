import type { ProductQuery } from "@/adapters/server/api/products";

/** page が受け取る素の `searchParams`。 */
export type RawSearchParams = Record<string, string | string[] | undefined>;

/** 一覧の並び順として受け付ける値。契約の `sort` に対応する。 */
const SORT_VALUES: readonly string[] = [
  "-publishedAt",
  "publishedAt",
  "-price",
  "price",
  "-name",
  "name",
];

const FIRST_MIN = 1;
const FIRST_MAX = 200;

function firstValue(value: string | string[] | undefined): string | undefined {
  const found = Array.isArray(value) ? value[0] : value;

  return found === "" ? undefined : found;
}

/**
 * URL の検索条件を、取得に渡す形へ直す。
 *
 * @remarks
 * URL は利用者が直接編集できる入力です。契約の範囲を外れた値をそのまま渡すと、画面が壊れる
 * 代わりにバックエンドが 400 を返し、利用者から見れば「URL をいじったら動かなくなった」に
 * なります。範囲外は捨てて既定に戻し、画面は成立させます。
 *
 * 同じキーが複数回現れた場合は先頭だけを使います。どれを採るかは決めておかないと、リンクの
 * 作り方次第で結果が変わります。
 */
export function toProductQuery(params: RawSearchParams): ProductQuery {
  const query: ProductQuery = {};
  const after = firstValue(params.after);
  const keyword = firstValue(params.keyword);
  const categoryId = firstValue(params.categoryId);
  const sort = firstValue(params.sort);
  const first = Number(firstValue(params.first));

  if (after !== undefined) {
    query.after = after;
  }

  if (keyword !== undefined) {
    query.keyword = keyword;
  }

  if (categoryId !== undefined) {
    query.categoryId = categoryId;
  }

  if (sort !== undefined && SORT_VALUES.includes(sort)) {
    query.sort = sort;
  }

  if (Number.isInteger(first) && first >= FIRST_MIN && first <= FIRST_MAX) {
    query.first = first;
  }

  return query;
}
