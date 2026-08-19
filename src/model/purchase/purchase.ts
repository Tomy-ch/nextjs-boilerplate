import type { CursorPage } from "../pagination";
import type { ProductId } from "../product/product";

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

/**
 * 成立した購入の明細 1 行。
 *
 * @remarks
 * 単価は**購入した時点の値**です。商品の現在価格が変わっても動きません。商品名だけは現在の
 * 名称で解決されて届くため、名前と単価は別の時点を指しています。
 */
export type PurchaseLine = {
  readonly productId: ProductId;
  readonly productName: string;
  readonly quantity: number;
  /** 購入時点の単価。基準通貨の decimal 文字列。 */
  readonly unitPrice: string;
};

/**
 * 成立した購入 1 件。
 *
 * @remarks
 * カートと違い、金額は**確定した請求額**です。小計・税・送料・合計はいずれもバックエンドが
 * 決めた値で、画面は足し直しません（[0070](../../../docs/adr/0070-backend-role-separation.md)）。
 *
 * 利用者へ見せる識別子は `code` です。`id` は次の取得に使う値であり、問い合わせの控えには
 * なりません。
 */
export type Purchase = {
  readonly id: string;
  readonly code: string;
  readonly statusName: string;
  /** 明細（単価 × 数量）の合計。最小単位の整数。 */
  readonly subtotalAmount: number;
  /** 税額。最小単位の整数。 */
  readonly taxAmount: number;
  /** 送料。最小単位の整数。 */
  readonly shippingFee: number;
  /** 請求額。最小単位の整数。 */
  readonly totalAmount: number;
  readonly lines: readonly PurchaseLine[];
  readonly orderedAt: Date;
};

/**
 * 購入を作るときに送る 1 行。
 *
 * @remarks
 * 送るのは商品と数量だけです。金額はバックエンドがその時点の価格から決めるため、画面が
 * 提示した金額を送り返す口がありません（送れたとしても、それは古い値になり得ます）。
 */
export type PurchaseOrderLine = {
  readonly productId: ProductId;
  readonly quantity: number;
};
