"use client";

import { useCallback, useId, useState } from "react";

import { cn } from "@/components/cn";
import {
  BASE_CURRENCY,
  formatMoney,
  formatReferenceAmount,
  type ReferenceAmount,
} from "@/model/money";
import { Toggle } from "../../action/toggle/toggle";

/** `AmountWithReference` の props。 */
export type AmountWithReferenceProps = {
  /** 金額の見出し。 */
  label: string;
  /** 基準通貨の金額。最小単位の整数。 */
  amount: number;
  /** 表示通貨での参考換算額。読めなければ null で、切り替えの操作ごと出さない。 */
  reference: ReferenceAmount | null;
  /** 金額の大きさ。脇に添える金額は控えめに、その画面の主役になる金額は大きく出す。 */
  size?: "compact" | "prominent";
};

const SHOW_REFERENCE_LABEL = "円で見る";

/**
 * 金額と、切り替えで現れる参考換算額。
 *
 * @remarks
 * **基準通貨の金額は常に出したままにします。** 請求されるのはその金額であり、切り替えで置き換えると
 * どちらで請求されるのかが読み取れません。切り替えが足すのは参考の 1 行だけです。
 *
 * **参考換算額が無いときは切り替えも出しません。** 押しても何も現れない操作は、失敗したのか
 * 対応していないのかを利用者から区別できません。
 *
 * レートと基準日を添えるのは、いつの相場による目安かが判らなければ参考にならないためです。
 *
 * 何の金額かは持ちません。見出しは呼び出し側が渡します。
 *
 * @example
 * ```tsx
 * import { AmountWithReference } from "@/components/design-system/display/amount-with-reference/amount-with-reference";
 *
 * <AmountWithReference amount={21_287} label="合計" reference={reference} />;
 * ```
 *
 * @param props.label - 金額の見出し。
 * @param props.amount - 基準通貨の金額。最小単位の整数。
 * @param props.reference - 表示通貨での参考換算額。読めなければ null。
 * @param props.size - 金額の大きさ。
 * @see Storybook `Display/AmountWithReference`
 */
export function AmountWithReference({
  label,
  amount,
  reference,
  size = "prominent",
}: AmountWithReferenceProps) {
  const [shown, setShown] = useState(false);
  const referenceId = useId();
  const toggle = useCallback(() => setShown((current) => !current), []);

  return (
    <div className="flex flex-col gap-1">
      <p className="flex items-baseline justify-between gap-2">
        <span className="text-muted-foreground text-sm">{label}</span>
        <strong className={cn(size === "compact" ? "text-lg" : "text-2xl")}>
          {formatMoney(amount)}
        </strong>
      </p>
      {reference === null ? null : (
        <div className="flex flex-col items-end gap-1">
          <Toggle
            aria-controls={referenceId}
            onClick={toggle}
            pressed={shown}
            size="sm"
            variant="outline"
          >
            {SHOW_REFERENCE_LABEL}
          </Toggle>
          <div className="flex flex-col items-end text-muted-foreground text-xs" id={referenceId}>
            {shown ? (
              <>
                <span>{`約 ${formatReferenceAmount(reference)}（参考）`}</span>
                <span>{`1 ${BASE_CURRENCY} = ${reference.rate} ${reference.currency}・基準日 ${reference.rateDate}`}</span>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
