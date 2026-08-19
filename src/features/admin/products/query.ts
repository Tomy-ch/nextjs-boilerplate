import { ADMIN_PRODUCT_LIST_PATH } from "../paths";

/**
 * 絞り込みを載せる URL のキー。契約のクエリ名と揃える。
 *
 * @remarks
 * 分類と状態は契約と同じく並びで載せます。**同じキーを繰り返す形**で、区切り文字で連結しません
 * —— 連結すると、値に区切り文字が現れた時点で別の条件が同じ URL になります。複数を選ばせる理由は
 * `docs/spec/route/admin/products/page.function.md`「検索条件は URL が持つ」。
 */
export const FILTER_KEY: Readonly<{
  KEYWORD: "keyword";
  CATEGORY: "categoryCodes";
  STATUS: "statusCodes";
}> = {
  KEYWORD: "keyword",
  CATEGORY: "categoryCodes",
  STATUS: "statusCodes",
};

/** いま見ているページの起点を載せる URL のキー。契約のクエリ名と揃える。 */
export const CURSOR_KEY = "after";

/**
 * ここまでに通ってきたページの起点を載せる URL のキー。
 *
 * @remarks
 * cursor は「次の位置」しか指さないため、戻る先はどこにも書かれていません
 * （[0073](../../../../docs/adr/0073-pagination-fetch-boundary.md)）。覚える場所を URL にする理由は
 * `docs/spec/route/admin/products/page.function.md`「戻る先は URL が覚える」。
 */
const TRAIL_KEY = "trail";

/**
 * 一覧に効いている絞り込み。
 *
 * @remarks
 * 「指定なし」は**空の並び**です。選択肢の側に指定なしを置くと、複数選べる条件では「指定なし」と
 * 具体的な値を同時に選べてしまいます。
 */
export type AdminProductListConditions = {
  /** 商品名に含まれる語。 */
  readonly keyword: string;
  /** 分類のコード。空なら分類で絞り込まない。 */
  readonly categoryCodes: readonly string[];
  /** 状態のコード。空なら状態で絞り込まない。 */
  readonly statusCodes: readonly string[];
};

/** 一覧の URL が表す、いま見ている場所。 */
export type AdminProductListLocation = AdminProductListConditions & {
  /** いま見ているページの起点。先頭ページでは null。 */
  readonly cursor: string | null;
  /** ここまでに通ってきたページの起点。先頭ページから順に並ぶ。 */
  readonly trail: readonly string[];
};

/** page が受け取る素の `searchParams`。 */
export type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  const found = Array.isArray(value) ? value[0] : value;

  return found?.trim() ?? "";
}

/** 同じ値の重複を畳む。並び順は最初に現れた位置を保つ。 */
function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

function all(value: string | string[] | undefined): readonly string[] {
  return (Array.isArray(value) ? value : [value]).flatMap((found) => {
    const trimmed = found?.trim() ?? "";

    return trimmed === "" ? [] : [trimmed];
  });
}

/**
 * 素の `searchParams` を、いま見ている場所として読む。
 *
 * @remarks
 * **URL は利用者が直接編集できます。** 起点が消えているのに通ってきた道だけが残った URL も届き得る
 * ため、先頭ページでは道を捨てます。捨てないと、先頭ページで「前へ」が押せる状態になります。
 *
 * 分類と状態は**重複を畳みます**。契約は重複の無い並びとして宣言しており、同じ値が 2 度届くのは
 * URL を直接編集したときで、指している条件は 1 度のときと同じです。畳まないと、意味の同じ条件が
 * 契約を外れた要求として backend まで届きます。
 */
export function toAdminProductListLocation(params: RawSearchParams): AdminProductListLocation {
  const cursor = first(params[CURSOR_KEY]);

  return {
    keyword: first(params[FILTER_KEY.KEYWORD]),
    categoryCodes: unique(all(params[FILTER_KEY.CATEGORY])),
    statusCodes: unique(all(params[FILTER_KEY.STATUS])),
    cursor: cursor === "" ? null : cursor,
    trail: cursor === "" ? [] : all(params[TRAIL_KEY]),
  };
}

function toHref(
  conditions: AdminProductListConditions,
  cursor: string | null,
  trail: readonly string[],
): string {
  const params = new URLSearchParams();

  if (conditions.keyword !== "") {
    params.set(FILTER_KEY.KEYWORD, conditions.keyword);
  }

  for (const [key, values] of [
    [FILTER_KEY.CATEGORY, conditions.categoryCodes],
    [FILTER_KEY.STATUS, conditions.statusCodes],
  ] as const) {
    for (const value of values) {
      params.append(key, value);
    }
  }

  if (cursor !== null) {
    params.set(CURSOR_KEY, cursor);

    for (const passed of trail) {
      params.append(TRAIL_KEY, passed);
    }
  }

  return params.size === 0
    ? ADMIN_PRODUCT_LIST_PATH
    : `${ADMIN_PRODUCT_LIST_PATH}?${params.toString()}`;
}

/**
 * 絞り込みを変えた先の URL を組む。
 *
 * @remarks
 * 読み進めた位置は載せません。条件が変わった後の「続き」は前の条件の続きを指しており、そのまま
 * 引き継ぐと、絞り直したのに前の条件の途中から始まります。
 */
export function toConditionHref(conditions: AdminProductListConditions): string {
  return toHref(conditions, null, []);
}

/** 次のページの URL を組む。 */
export function toNextPageHref(location: AdminProductListLocation, nextCursor: string): string {
  const trail = location.cursor === null ? [] : [...location.trail, location.cursor];

  return toHref(location, nextCursor, trail);
}

/**
 * 前のページの URL を組む。
 *
 * @remarks
 * 先頭ページには戻る先がないため、行き先を返しません。省略された向きは押せない control として
 * 描かれます（`components/app-starter/cursor-pagination`）。
 *
 * @returns 先頭ページなら undefined
 */
export function toPreviousPageHref(location: AdminProductListLocation): string | undefined {
  if (location.cursor === null) {
    return undefined;
  }

  const trail = [...location.trail];
  const previous = trail.pop() ?? null;

  return toHref(location, previous, trail);
}
