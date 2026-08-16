import { FILTER_KEY, type ProductListSelection } from "../facade/list-url/list-url";

/**
 * 在庫の有無で選べる状態。
 *
 * @remarks
 * 契約が受け取るのは在庫数の下限と上限で、「在庫あり」という状態は持ちません。利用者が選ぶのは
 * 数ではなく有無なので、その 2 つをここで橋渡しします。
 */
export const STOCK_AVAILABILITY: Readonly<{
  ALL: "";
  IN_STOCK: "in-stock";
  OUT_OF_STOCK: "out-of-stock";
}> = {
  /** 在庫を条件にしない。 */
  ALL: "",
  /** 1 つ以上ある。 */
  IN_STOCK: "in-stock",
  /** 1 つも無い。 */
  OUT_OF_STOCK: "out-of-stock",
};

/** {@link STOCK_AVAILABILITY} のいずれか。 */
export type StockAvailability = (typeof STOCK_AVAILABILITY)[keyof typeof STOCK_AVAILABILITY];

/** 在庫状況の選択肢 1 件。 */
export type StockAvailabilityOption = {
  readonly value: StockAvailability;
  readonly label: string;
};

/** 在庫状況の選択肢。 */
export const STOCK_AVAILABILITY_OPTIONS: readonly StockAvailabilityOption[] = [
  { value: STOCK_AVAILABILITY.ALL, label: "すべて" },
  { value: STOCK_AVAILABILITY.IN_STOCK, label: "在庫あり" },
  { value: STOCK_AVAILABILITY.OUT_OF_STOCK, label: "在庫なし" },
];

/** 在庫状況の条件名。条件の chip に出す。 */
export const STOCK_AVAILABILITY_LABEL = "在庫状況";

/**
 * いま効いている在庫数の条件を、在庫状況へ写す。
 *
 * @remarks
 * 在庫数の下限と上限は URL で直接指定でき、「1 つ以上」「1 つも無い」以外の範囲も書けます。
 * どちらにも当てはまらない範囲は「すべて」として読みます。3 つの選択肢のどれかに寄せると、
 * 選んでいない状態が選ばれているように見えます。
 */
export function toStockAvailability(selection: ProductListSelection): StockAvailability {
  const min = selection[FILTER_KEY.MIN_QUANTITY];
  const max = selection[FILTER_KEY.MAX_QUANTITY];

  if (min === "1" && (max === undefined || max === "")) {
    return STOCK_AVAILABILITY.IN_STOCK;
  }

  if (max === "0" && (min === undefined || min === "")) {
    return STOCK_AVAILABILITY.OUT_OF_STOCK;
  }

  return STOCK_AVAILABILITY.ALL;
}

/** 在庫状況を在庫数の条件へ書き戻す。 */
export function applyStockAvailability(
  selection: ProductListSelection,
  availability: StockAvailability,
): ProductListSelection {
  return {
    ...selection,
    [FILTER_KEY.MIN_QUANTITY]: availability === STOCK_AVAILABILITY.IN_STOCK ? "1" : "",
    [FILTER_KEY.MAX_QUANTITY]: availability === STOCK_AVAILABILITY.OUT_OF_STOCK ? "0" : "",
  };
}
