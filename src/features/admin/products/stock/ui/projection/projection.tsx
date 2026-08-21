import { STOCK_DIRECTION, type StockDirection } from "../../stock-direction";

/** `StockProjection` の props。 */
export type StockProjectionProps = {
  /** 読み込んだ時点の在庫数。 */
  current: number;
  /** 動かす向き。 */
  direction: StockDirection;
  /** 動かす量。読めない入力なら null。 */
  quantity: number | null;
};

/**
 * 送信したらいくつになるかの見込み。
 *
 * @remarks
 * **見込みが負になっても入力を止めません。**止める根拠が読み込んだ時点の在庫しか無いためで、
 * 増減後が範囲を外れた要求は契約が `422` で拒みます。
 *
 * 参考値である理由と、量が読めないうちに出さない理由は
 * [画面要件](../../../../../../docs/spec/route/admin/products/[id]/stock/page.screen.md)「送信後の見込みを出す」。
 */
export function StockProjection({ current, direction, quantity }: StockProjectionProps) {
  if (quantity === null) return null;

  const projected = direction === STOCK_DIRECTION.DEDUCT ? current - quantity : current + quantity;

  return (
    <p className="text-sm">
      <span className="text-muted-foreground">送信後の見込み</span>{" "}
      <span className="font-semibold tabular-nums">{projected}</span>
      {projected < 0 ? (
        <span className="ml-2 text-muted-foreground">
          在庫より多く差し引く要求は受け付けられません。
        </span>
      ) : null}
    </p>
  );
}
