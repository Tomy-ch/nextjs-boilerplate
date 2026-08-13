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
  SORT: "sort";
}> = {
  CATEGORY: "categoryId",
  STATUS: "statusId",
  KEYWORD: "keyword",
  SORT: "sort",
};

/** URL に載せる検索条件。値が空文字のキーは「指定なし」を表す。 */
export type ProductListSelection = Readonly<Record<string, string>>;

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
