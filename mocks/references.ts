import type { DrawFromEndpoint, ReferencePatches } from "./stable-responses";

/**
 * 契約が持つ相互参照の表。
 *
 * @remarks
 * 契約から生成した応答は口ごとに独立しているため、商品が名乗る分類・状態の識別子が、それらを
 * 一覧する口の応答に**存在しません**。画面は選択肢に無い値を「選べない」として扱うので、参照の
 * 整合をここで取ります。
 *
 * **契約ごとの知識なので、機構（`stable-responses.ts`）ではなくこちらが持ちます。** fork 先は
 * 自分の契約の参照をこの表に書き、この題材ごと破棄します。
 */

/** 分類マスタの口。seed は要求の URL から決まるので、画面が叩くのと同じ綴りを使う。 */
const CATEGORIES_PATH = "/v1/products/categories";

/** 状態マスタの口。 */
const STATUSES_PATH = "/v1/products/statuses";

/** マスタが返す 1 件。識別子と表示名だけを見る。 */
type MasterEntry = { readonly id: string; readonly name: string };

/** 応答から、マスタの一覧として読める配列を取り出す。 */
function entriesOf(response: unknown): readonly MasterEntry[] {
  if (!Array.isArray(response)) {
    throw new Error("マスタの応答が一覧ではありません");
  }

  return response as readonly MasterEntry[];
}

/**
 * 参照の項目を、マスタの一覧から選び直す。
 *
 * @remarks
 * どの 1 件を選ぶかは、いま入っている識別子から決めます。要求ごとに同じ結果へ落ちる必要があり、
 * かつ商品ごとに違う分類が付いてほしいためです。
 */
function pick(entries: readonly MasterEntry[], current: unknown): MasterEntry {
  const [first] = entries;

  if (first === undefined) {
    throw new Error("マスタの一覧が空です");
  }

  const key = typeof current === "string" ? current : "";
  const offset = [...key].reduce((sum, character) => sum + character.charCodeAt(0), 0);

  return entries[offset % entries.length] ?? first;
}

/** 商品 1 件の分類と状態を、マスタの一覧に在るものへ揃える。 */
function alignProduct(product: unknown, draw: DrawFromEndpoint): unknown {
  if (typeof product !== "object" || product === null) {
    throw new Error("商品の応答が object ではありません");
  }

  const record = product as Record<string, unknown>;

  if (!("category" in record) || !("status" in record)) {
    throw new Error("商品の応答が分類または状態を持ちません");
  }

  const categories = entriesOf(draw("getGetProductCategoriesResponseMock", CATEGORIES_PATH));
  const statuses = entriesOf(draw("getGetProductStatusesResponseMock", STATUSES_PATH));

  return {
    ...record,
    category: pick(categories, (record.category as Record<string, unknown> | null)?.id),
    status: pick(statuses, (record.status as Record<string, unknown> | null)?.id),
  };
}

/** 一覧の応答に含まれる商品を、1 件ずつ揃える。 */
function alignProductList(response: unknown, draw: DrawFromEndpoint): unknown {
  if (typeof response !== "object" || response === null) {
    throw new Error("一覧の応答が object ではありません");
  }

  const record = response as Record<string, unknown>;
  const products = record.products;

  if (!Array.isArray(products)) {
    throw new Error("一覧の応答が商品の配列を持ちません");
  }

  return { ...record, products: products.map((product) => alignProduct(product, draw)) };
}

/**
 * 商品が名乗る分類・状態を、マスタの一覧に在るものへ揃える表。
 *
 * @remarks
 * **項目が消えたら落とします。** 契約が変わって参照の項目が無くなったとき、黙って整合が外れると
 * 今と同じ状態（選択肢に無い値が入った画面）へ戻ります。落ちれば、契約に追随して表を直す契機に
 * なります。
 */
export const REFERENCE_PATCHES: ReferencePatches = new Map([
  ["getGetProductsResponseMock", alignProductList],
  ["getGetProductsDetailResponseMock", alignProduct],
  ["getPostProductsResponseMock", alignProduct],
  ["getPatchProductsDetailResponseMock", alignProduct],
  ["getPatchProductsStockResponseMock", alignProduct],
]);
