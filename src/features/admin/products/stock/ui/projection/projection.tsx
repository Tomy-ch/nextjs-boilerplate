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
 * **参考値です。**現在の在庫は読み込んだ時点の写しなので、送るまでの間に動いていれば結果は
 * この数になりません。実際にいくつになるかを決めるのは契約側で、画面はそれを先取りしません。
 *
 * 見込みが負になっても入力を止めません。止める根拠が古い在庫しか無く、契約が拒むかどうかは
 * 送ってみるまで判らないためです。範囲を外れた要求は契約が `422` で拒みます。
 *
 * 量が読めないうちは何も出しません。打ちかけの「1」に対して見込みを出すと、数字が打鍵ごとに
 * 動いて読めません。
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
