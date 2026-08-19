import { ADMIN_PRODUCT_LIST_PATH } from "../paths";

/**
 * 絞り込みを載せる URL のキー。契約のクエリ名と揃える。
 *
 * @remarks
 * 契約は分類と状態を並びで受け取りますが、この画面は 1 つだけ選ばせます。載せる値が 1 つでも
 * キー名は契約のものを使い、送る側で読み替えません。単一に絞る理由は
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
 * 「指定なし」を空文字で表します。選択肢の側が指定なしを持てば、操作は値を差し替えるだけで済み、
 * キーを消す分岐を入力欄が持たずに済みます。
 */
export type AdminProductListConditions = {
  /** 商品名に含まれる語。 */
  readonly keyword: string;
  /** 分類のコード。 */
  readonly categoryCode: string;
  /** 状態のコード。 */
  readonly statusCode: string;
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
 * 分類と状態は先頭の 1 つだけを読みます。同じキーが繰り返された URL でも、この画面が扱えるのは
 * 1 つであり、どれを採るかを読む側ごとに決めると同じ URL が場所によって違う条件に見えます。
 */
export function toAdminProductListLocation(params: RawSearchParams): AdminProductListLocation {
  const cursor = first(params[CURSOR_KEY]);

  return {
    keyword: first(params[FILTER_KEY.KEYWORD]),
    categoryCode: first(params[FILTER_KEY.CATEGORY]),
    statusCode: first(params[FILTER_KEY.STATUS]),
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

  for (const [key, value] of [
    [FILTER_KEY.KEYWORD, conditions.keyword],
    [FILTER_KEY.CATEGORY, conditions.categoryCode],
    [FILTER_KEY.STATUS, conditions.statusCode],
  ] as const) {
    if (value !== "") {
      params.set(key, value);
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
