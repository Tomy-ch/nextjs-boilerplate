"use client";

import { MinusIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useCallback } from "react";

import { Button } from "@/components/design-system/action/button/button";

/** `CartQuantityStepper` の props。 */
export type CartQuantityStepperProps = {
  /** 現在の数量。 */
  quantity: number;
  /** 数量の上限。ここに達したら増やす操作を押せなくする。 */
  max: number;
  /** 対象の名前。操作の読み上げを行ごとに区別するために使う。 */
  label: string;
  /** 変更後の数量を受け取る。0 は削除を意味する。 */
  onChange: (quantity: number) => void;
};

/**
 * 明細 1 行の数量を増減する操作。
 *
 * @remarks
 * 数量が 1 のときだけ減らす操作をゴミ箱の記号にします。1 から減らすことは削除と同じであり、
 * 0 個の行を残さないためです。記号だけでは何が起きるか判らないので、読み上げる名前も
 * 「減らす」から「削除する」へ変えます。
 *
 * 上限に達したら増やす操作を押せなくします。押しても何も起きない操作を残すと、反応が無いのか
 * 上限なのかが利用者から区別できません。
 */
export function CartQuantityStepper({ quantity, max, label, onChange }: CartQuantityStepperProps) {
  const removes = quantity <= 1;
  const decrease = useCallback(() => onChange(quantity - 1), [onChange, quantity]);
  const increase = useCallback(() => onChange(quantity + 1), [onChange, quantity]);

  return (
    <div className="flex items-center gap-1" data-slot="cart-quantity-stepper">
      <Button
        aria-label={removes ? `${label} を削除する` : `${label} を 1 つ減らす`}
        onClick={decrease}
        size="sm"
        type="button"
        variant="ghost"
      >
        {removes ? (
          <Trash2Icon aria-hidden="true" className="size-4" />
        ) : (
          <MinusIcon aria-hidden="true" className="size-4" />
        )}
      </Button>
      <span className="min-w-6 text-center text-sm tabular-nums">{quantity}</span>
      <Button
        aria-label={`${label} を 1 つ増やす`}
        disabled={quantity >= max}
        onClick={increase}
        size="sm"
        type="button"
        variant="ghost"
      >
        <PlusIcon aria-hidden="true" className="size-4" />
      </Button>
    </div>
  );
}
