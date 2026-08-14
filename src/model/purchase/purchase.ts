import type { CursorPage } from "../pagination";

/**
 * 履歴に並ぶ購入 1 件。
 *
 * @remarks
 * 契約の wire 型ではなく、表示のための型です。一覧は概要だけを返し、明細は含みません。
 *
 * ステータスは ID と名称が解決済みで届くため、名称を引き直しません。
 */
export type PurchaseHistoryEntry = {
  /** 購入コード。利用者へ見せる識別子であり、問い合わせにも使う。 */
  readonly code: string;
  /** 合計。最小単位の整数で持ち、表示の直前に主単位へ戻す。 */
  readonly totalAmount: number;
  readonly statusName: string;
  readonly orderedAt: Date;
};

/** cursor 方式で取得した購入履歴の 1 ページ。 */
export type PurchaseHistoryPage = CursorPage<PurchaseHistoryEntry>;
