"use client";

import { useScrollDirection } from "@/capabilities/use-scroll-direction";
import { cn } from "@/components/cn";
import { Button } from "@/components/design-system/action/button/button";

/** `ProductFilterApply` の props。 */
export type ProductFilterApplyProps = {
  /** 組み立てた条件に一致する件数。まだ一度も数えていなければ省く。 */
  count?: number;
  /** いまの条件で数え終えていないか。 */
  counting?: boolean;
  /** 反映の取得が終わっていないか。 */
  pending?: boolean;
  /** 押されたときに呼ぶ。 */
  onApply: () => void;
};

/**
 * 絞り込みを確定する操作。
 *
 * @remarks
 * **押すまで一覧は変わりません。** 代わりに、押す前から何件になるかが分かります。件数が先に
 * 分かることが、確定を明示にしても手数が増えない理由です。
 *
 * 入力欄の下に置いたまま、その位置が画面の外へ出るときだけ追従します。分類が増えるほど入力欄は
 * 縦に伸び、末尾に固定された操作は選んでいる途中で見えなくなります。
 *
 * **下へ読み進めているあいだは引っ込めます。** その間に見たいのは一覧であって、確定の操作では
 * ありません。上へ戻ろうとした時点で出るので、絞り込み直す構えに入ればすぐ届きます。引き手は
 * 置きません。脇に領域を持てる幅にしか出ない器で、入力欄そのものがすぐ上にあるためです。
 *
 * 引っ込めている間も focus は失いません。keyboard で辿り着いた操作が見えない位置にあると、
 * 押せるものが画面のどこにも見当たらない状態になります。
 *
 * **数え直している間は 1 つ前の件数を薄くして残します。** 消すと、条件を選ぶたびに数が現れては
 * 消え、読み取る前に入れ替わります。行の高さは数が無いときも空けておき、現れた瞬間に操作の位置が
 * 動かないようにします。
 */
export function ProductFilterApply({
  count,
  counting = false,
  pending = false,
  onApply,
}: ProductFilterApplyProps) {
  const hidden = useScrollDirection() === "down";

  return (
    <div
      className={cn(
        "sticky bottom-4 z-10 grid gap-2 rounded-lg border bg-background p-3 shadow-sm transition-[opacity,translate] focus-within:translate-y-0 focus-within:opacity-100",
        hidden && "translate-y-6 opacity-0",
      )}
      data-testid="product-filter-apply"
    >
      <Button disabled={pending} onClick={onApply} type="button">
        絞り込み
      </Button>
      <p
        aria-live="polite"
        className={cn(
          "min-h-5 text-center text-muted-foreground text-sm transition-opacity",
          counting && "opacity-60",
        )}
      >
        {count === undefined ? null : `該当件数 ${count} 件`}
      </p>
    </div>
  );
}
