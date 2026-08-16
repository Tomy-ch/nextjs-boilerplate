import { cn } from "@/components/cn";
import { formatMoney } from "@/model/money";

/** `CartSubtotal` の props。 */
export type CartSubtotalProps = {
  /** 小計。USD セント単位の整数。 */
  amount: number;
  /**
   * 器に合わせた大きさ。
   *
   * 脇の領域では中身と同じ送りの中に並ぶため控えめに、全画面と引き出しでは金額が主役になるため
   * 大きく出す。
   */
  size?: "compact" | "prominent";
};

/**
 * カートの小計。
 *
 * @remarks
 * バックエンドが返した値をそのまま出します。買える明細だけを合算した参考値であり、ここでは
 * 足し直しません（[0070](../../../../../docs/adr/0070-backend-role-separation.md)）。
 *
 * 金額の書式は locale に従います（[0120](../../../../../docs/adr/0120-locale-aware-formatting.md)）。
 */
export function CartSubtotal({ amount, size = "prominent" }: CartSubtotalProps) {
  return (
    <p className="flex items-baseline justify-between gap-2" data-slot="cart-subtotal">
      <span className="text-muted-foreground text-sm">小計</span>
      <strong className={cn(size === "compact" ? "text-lg" : "text-2xl")}>
        {formatMoney(amount)}
      </strong>
    </p>
  );
}
