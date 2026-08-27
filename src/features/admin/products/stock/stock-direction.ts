/**
 * 在庫を動かす向き。
 *
 * @remarks
 * 符号を画面が持たず向きで表すのは、入力する人が「補充」と「差し引き」のどちらをしているかを
 * 先に選ぶためです。1 つの欄で符号付きの数を受けると、マイナスの入れ忘れがそのまま逆向きの
 * 更新になり、しかも取り消す手段が「反対向きにもう一度送る」しかありません。
 */
export const STOCK_DIRECTION = {
  /** 在庫を増やす。 */
  REPLENISH: "replenish",
  /** 在庫を減らす。 */
  DEDUCT: "deduct",
} as const;

/** 在庫を動かす向き。 */
export type StockDirection = (typeof STOCK_DIRECTION)[keyof typeof STOCK_DIRECTION];

/** 既定の向き。画面の名前が「補充」である以上、増やす側から始める。 */
export const DEFAULT_STOCK_DIRECTION: StockDirection = STOCK_DIRECTION.REPLENISH;

/** 向きの呼び名。 */
export const STOCK_DIRECTION_LABELS = {
  [STOCK_DIRECTION.REPLENISH]: "補充する",
  [STOCK_DIRECTION.DEDUCT]: "差し引く",
} as const satisfies Readonly<Record<StockDirection, string>>;

/** 外から来た値が向きのどちらかであるかを判定する。 */
export function isStockDirection(value: unknown): value is StockDirection {
  return value === STOCK_DIRECTION.REPLENISH || value === STOCK_DIRECTION.DEDUCT;
}

/**
 * 向きと量を、契約が受け取る増減量へ直す。
 *
 * @remarks
 * 契約は符号付きの 1 つの数で受け取ります（`delta`）。向きと量に分かれているのは画面の都合で、
 * 送る直前にここで畳みます。
 */
export function toStockDelta(direction: StockDirection, quantity: number): number {
  return direction === STOCK_DIRECTION.DEDUCT ? -quantity : quantity;
}
