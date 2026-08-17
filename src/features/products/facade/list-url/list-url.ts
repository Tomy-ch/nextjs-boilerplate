/**
 * 一覧のパス。条件を変えた先の URL を組むときの起点になる。
 */
export const PRODUCT_LIST_PATH = "/products";

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
  MIN_PRICE: "minPrice";
  MAX_PRICE: "maxPrice";
  MIN_QUANTITY: "minQuantity";
  MAX_QUANTITY: "maxQuantity";
  SORT: "sort";
}> = {
  CATEGORY: "categoryId",
  STATUS: "statusId",
  KEYWORD: "keyword",
  MIN_PRICE: "minPrice",
  MAX_PRICE: "maxPrice",
  MIN_QUANTITY: "minQuantity",
  MAX_QUANTITY: "maxQuantity",
  SORT: "sort",
};

/**
 * 複数の値を受け取れる条件のキー。
 *
 * @remarks
 * ここに無いキーは、URL に同じキーが 2 度現れても 1 つの値としてしか読めません。**URL は利用者が
 * 直接編集できる**ので、単一の条件にも繰り返しが届き得ます。どの条件が繰り返しを持てるかを 1 か所
 * で宣言するのは、読む側それぞれが判断すると、同じ URL が画面の場所によって違う条件に見えるため
 * です。
 */
export const MULTI_VALUE_KEYS: readonly string[] = [FILTER_KEY.CATEGORY];

/**
 * URL に載せる検索条件。
 *
 * @remarks
 * 値が空文字と空の並びは、どちらも「指定なし」を表します。操作の側が値を差し替えるだけで
 * 済むよう、キーを消す分岐を持たせていません。
 *
 * 複数選べる条件は並びで持ちます。区切り文字で連結すると、区切り文字を含む値が現れた時点で
 * 分解できなくなり、契約が受け取る形（同じキーの繰り返し）とも食い違います。
 */
export type ProductListSelection = Readonly<Record<string, string | readonly string[]>>;

/**
 * 条件 1 つを、単一の文字列として読む。
 *
 * @remarks
 * 複数回現れた条件は単一の値として読めないため、空として扱います。**URL は利用者が直接編集
 * できる**ので、1 つしか受け取らない条件にも並びが届き得ます。読み方をここに 1 つだけ置くのは、
 * 読む側それぞれが独自に畳むと、同じ URL が場所によって違う条件に見えるためです。
 */
export function toSelectedValue(selection: ProductListSelection, key: string): string {
  const value = selection[key];

  return typeof value === "string" ? value : "";
}

/** 条件 1 つを、値の有無によらず並びとして読む。 */
export function toSelectedValues(selection: ProductListSelection, key: string): readonly string[] {
  const value = selection[key];

  if (value === undefined) {
    return [];
  }

  return typeof value === "string" ? (value === "" ? [] : [value]) : value;
}

/**
 * 読み進めた位置を落として、条件だけを取り出す。
 *
 * @remarks
 * 増分取得へ渡す条件を作ります。位置を含めたまま渡すと、続きの取得が「続きの続き」を指します。
 */
export function toConditions(selection: ProductListSelection): ProductListSelection {
  return Object.fromEntries(
    Object.entries(selection).filter(([key]) => !POSITION_KEYS.includes(key)),
  );
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
 * ブラウザの履歴も同じ画面を別物として扱います。複数選べる条件は値どうしも並べ替えます。選んだ
 * 順序は条件の一部ではないため、順序だけが違う URL は同じ画面を指しています。
 */
export function toProductListHref(selection: ProductListSelection): string {
  const params = toProductListSearchParams(selection);

  return params.size === 0 ? PRODUCT_LIST_PATH : `${PRODUCT_LIST_PATH}?${params.toString()}`;
}

/**
 * 検索条件をクエリ文字列へ組む。
 *
 * @remarks
 * 並べ替えの規則は {@link toProductListHref} と同じものです。取得の口へ渡す条件と、画面が指す
 * URL とで並べ方が違うと、同じ条件が別の文字列になり、取得結果を URL で見分けられなくなります。
 */
export function toProductListSearchParams(selection: ProductListSelection): URLSearchParams {
  const params = new URLSearchParams();
  const keys = Object.keys(selection)
    .filter((key) => !POSITION_KEYS.includes(key))
    .sort((left, right) => left.localeCompare(right));

  for (const key of keys) {
    for (const value of [...toSelectedValues(selection, key)].sort((left, right) =>
      left.localeCompare(right),
    )) {
      params.append(key, value);
    }
  }

  return params;
}
