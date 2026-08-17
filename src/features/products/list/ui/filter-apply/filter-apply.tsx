"use client";

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
 * **入力欄の下に置いたまま、置かれた器の下端へ貼り付きます。** 分類が増えるほど入力欄は縦に伸び、
 * 末尾に置いたままだと選んでいる途中で見えなくなります。器が画面に収まるあいだは入力欄のすぐ下に
 * 見え、収まらなくなると器の送りに追従して下端に残ります。引き手は置きません。脇に領域を持てる
 * 幅にしか出ない器で、入力欄そのものがすぐ上にあるためです。
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
  return (
    <div className="sticky bottom-0 z-10 grid gap-2 rounded-lg border bg-background p-3 shadow-sm">
      <Button disabled={pending} onClick={onApply} type="button">
        絞り込み
      </Button>
      <p
        className={cn(
          "min-h-5 text-center text-muted-foreground text-sm transition-opacity",
          counting && "opacity-60",
        )}
        role="status"
      >
        {count === undefined ? null : `該当件数 ${count} 件`}
      </p>
    </div>
  );
}
