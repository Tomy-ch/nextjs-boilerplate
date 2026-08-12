/** page が受け取る素の `searchParams`。 */
export type RawSearchParams = Record<string, string | string[] | undefined>;

/** 一覧のパス。条件を変えた先の URL を組むときの起点になる。 */
export const PRODUCT_LIST_PATH = "/products";

/** 一覧が 1 度に読み込む件数。 */
export const PRODUCT_PAGE_SIZE = 24;

/** ページ送りのカーソルを載せる URL のキー。 */
export const CURSOR_KEY = "after";

/**
 * 読み込む件数を載せる URL のキー。
 *
 * @remarks
 * 増分取得は読み進めた件数をここへ書き戻します。同じ URL がそのまま同じ長さの一覧になるため、
 * 戻る操作でも再読み込みでも、ブラウザ既定のスクロール復元がそのまま働きます。
 */
export const COUNT_KEY = "first";

/** 条件が変わったときに引き継がない URL のキー。読み進めた位置は前の条件に属する。 */
const POSITION_KEYS: readonly string[] = [CURSOR_KEY, COUNT_KEY];

/** 絞り込みと並び替えを載せる URL のキー。契約のクエリ名と揃える。 */
export const FILTER_KEY: Readonly<{
  CATEGORY: "categoryId";
  STATUS: "statusId";
  KEYWORD: "keyword";
  SORT: "sort";
}> = {
  CATEGORY: "categoryId",
  STATUS: "statusId",
  KEYWORD: "keyword",
  SORT: "sort",
};

/**
 * 読み進めた位置を落として、条件だけを取り出す。
 *
 * @remarks
 * 増分取得へ渡す条件を作ります。位置を含めたまま渡すと、続きの取得が「続きの続き」を指します。
 */
export function toConditions(
  selection: Readonly<Record<string, string>>,
): Readonly<Record<string, string>> {
  return Object.fromEntries(
    Object.entries(selection).filter(([key]) => !POSITION_KEYS.includes(key)),
  );
}

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

/**
 * URL に載せる検索条件。値が空文字のキーは「指定なし」を表す。
 *
 * @remarks
 * 「指定なし」をキーの不在ではなく空文字で表せるようにしてあるのは、絞り込みの操作が
 * 「すべて」を選び直す形を取るためです。選択肢の側が空文字を持てば、操作は値を差し替えるだけで
 * 済み、キーを消す分岐を UI が持たずに済みます。
 */
export type ProductListSelection = Readonly<Record<string, string>>;

/**
 * 素の `searchParams` を、1 つのキーに 1 つの文字列へ均す。
 *
 * @remarks
 * 同じキーが複数回現れたときは先頭だけを採ります。どれを採るかを決めておかないと、リンクの
 * 組み方次第で同じ URL が違う結果になります。
 *
 * 前後の空白を落とし、残りが空なら未指定として扱います。入力欄を空にして送った form は
 * `?keyword=` を URL に残すため、これを不正な入力と扱うと、消しただけで検索できなくなります。
 */
export function normalizeSearchParams(params: RawSearchParams): Readonly<Record<string, string>> {
  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(params)) {
    const found = Array.isArray(value) ? value[0] : value;
    const trimmed = found?.trim();

    if (trimmed !== undefined && trimmed !== "") {
      normalized[key] = trimmed;
    }
  }

  return normalized;
}

/**
 * 検索条件から一覧の URL を組む。
 *
 * @remarks
 * 読み進めた位置は載せません。条件が変わった後の「続き」は前の条件の続きを指しており、そのまま
 * 引き継ぐと、選び直したのに前の条件の途中から始まります。位置を URL へ書き戻すのは増分取得の
 * 側の役目で、こちらは条件が変わる場面だけを扱います。
 *
 * キーを並べ替えてから組み立てます。同じ条件が選択の順序で違う URL になると、共有されたリンクも
 * ブラウザの履歴も同じ画面を別物として扱います。
 */
export function toProductListHref(selection: ProductListSelection): string {
  const params = new URLSearchParams();
  const entries = Object.entries(selection)
    .filter(([key, value]) => !POSITION_KEYS.includes(key) && value !== "")
    .sort(([left], [right]) => left.localeCompare(right));

  for (const [key, value] of entries) {
    params.set(key, value);
  }

  return params.size === 0 ? PRODUCT_LIST_PATH : `${PRODUCT_LIST_PATH}?${params.toString()}`;
}
