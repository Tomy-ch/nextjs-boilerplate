/**
 * 集計対象期間の区分。
 *
 * @remarks
 * 契約の区分に対応しますが、宣言はここに置きます。**期間を選ぶ操作は client にあり**、取得の口は
 * `server-only` の内側にあるためです。取得の口に置くと、選択肢を読むだけの部品が取得の一式ごと
 * client の束へ引き込みます（[0024](../../../docs/adr/0024-adapters-server-client-split.md)）。
 *
 * 契約とのずれは取得の口が型で捕まえます（`adapters/server/api/dashboard.ts`）。
 */
export const DASHBOARD_PERIOD: Readonly<{ TODAY: "today"; MONTH: "month"; RANGE: "range" }> = {
  /** 今日。契約の既定値。 */
  TODAY: "today",
  /** 今月。 */
  MONTH: "month",
  /** 指定した両端の日付までの期間。 */
  RANGE: "range",
};

/** 集計対象期間として指定できる値。 */
export type DashboardPeriod = (typeof DASHBOARD_PERIOD)[keyof typeof DASHBOARD_PERIOD];

/**
 * 横断集計の取得条件。
 *
 * @remarks
 * 期間の境界はサーバのタイムゾーンで決まります。日付は暦日の文字列のまま持ち回り、`Date` へ
 * 直しません。ブラウザの時差で暦日がずれると、指定したつもりの日と集計された日が食い違います。
 */
export type DashboardSummaryQuery = {
  readonly period?: DashboardPeriod;
  /** 集計の開始日。`period` が `range` のときだけ効く。 */
  readonly from?: string;
  /** 集計の終了日。この日を含む。 */
  readonly to?: string;
};

/**
 * 集計対象期間に注文された購入を、ステータスごとに数えた 1 行。
 *
 * @remarks
 * ステータスは ID と名称が解決済みで届くため、名称を引き直しません。
 */
export type PurchaseStatusCount = {
  readonly statusId: string;
  readonly statusName: string;
  readonly count: number;
};

/**
 * 管理側が読む横断集計。
 *
 * @remarks
 * **合成はバックエンドが済ませています**（[0070](../../../docs/adr/0070-backend-role-separation.md)）。
 * 画面はここにある値をそのまま出すだけで、足したり割ったりしません。
 *
 * **3 つの値は母集団が違います。** 売上（{@link DashboardSummary.salesAmount} /
 * {@link DashboardSummary.salesCount}）はキャンセルを除いた購入、
 * {@link DashboardSummary.purchaseStatusCounts} はキャンセルを含む購入、商品数は期間に依存しない
 * マスタの現在値です。件数を足し合わせると、どの母集団にも属さない数ができます。
 */
export type DashboardSummary = {
  /** 売上合計。最小単位の整数で持ち、表示の直前に主単位へ戻す。 */
  readonly salesAmount: number;
  /** 売上に算入した購入の件数。 */
  readonly salesCount: number;
  /** ステータス別の件数。期間内に現れたステータスだけが並ぶ。 */
  readonly purchaseStatusCounts: readonly PurchaseStatusCount[];
  /** 登録済みの商品数。未公開を含む。 */
  readonly totalProductCount: number;
  /** 公開済みの商品数。 */
  readonly publishedProductCount: number;
};
