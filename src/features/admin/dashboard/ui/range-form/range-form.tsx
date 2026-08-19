"use client";

import { useId } from "react";

import { Button } from "@/components/design-system/action/button/button";
import { Input } from "@/components/design-system/form/input/input";
import { FormField } from "@/components/patterns/form-field/form-field";

import { ADMIN_ANALYTICS_PATH } from "../../../paths";
import { PERIOD_KEY } from "../../period";

/**
 * 日付の入力欄 1 つ分の幅。
 *
 * @remarks
 * `FormField` は器の幅いっぱいに広がるため、入力欄だけを細くしても組は 1 行を占めます。
 * 幅は組の側に持たせないと、2 つの日付と操作が横に並びません。
 */
const FIELD_WIDTH = "w-44";

/** `RangeForm` の props。 */
export type RangeFormProps = {
  /** URL に載っていた開始日。 */
  from?: string;
  /** URL に載っていた終了日。 */
  to?: string;
  /** 日付の指定が成立していないときに出す文言。 */
  message?: string;
};

/**
 * 集計する期間の両端を選ぶ。
 *
 * @remarks
 * **native の GET フォームです。** 送信すると入力した値がそのまま URL のクエリになり、その URL
 * が集計の条件になります。送信を横取りする handler も、入力を持つ state もありません。client
 * にあるのは `id` の生成だけで、JavaScript が届かなくても期間は選び直せます。
 *
 * **日付の前後は `min` / `max` でも示します。** ただしこの制約が見ているのは URL に載っていた
 * 値で、いま書き換えている途中の値ではありません。入れ替わった組を送れてしまうので、送った先で
 * `message` として返ってきます（[0062](../../../../../../docs/adr/0062-form-input-validation.md)）。
 *
 * **誤りの文言は組の下に 1 つだけ置きます。** 指しているのは片方の値ではなく 2 つの日付の
 * 関係なので、どちらかの項目の中へ入れると、直す相手が決め打ちになります。並びの外へ出すことで、
 * 文言が出ても 2 つの入力欄の高さがそろったままになります。両方の入力欄が `aria-describedby`
 * でこの文言を指すため、どちらから辿っても読めます。
 *
 * @see Storybook `Page/Admin/Analytics`
 */
export function RangeForm({ from, to, message }: RangeFormProps) {
  const fromId = useId();
  const toId = useId();
  const errorId = useId();

  return (
    <form action={ADMIN_ANALYTICS_PATH} className="flex flex-wrap items-end gap-4" method="get">
      <input name={PERIOD_KEY.PERIOD} type="hidden" value="range" />
      <div className={FIELD_WIDTH}>
        <FormField controlId={fromId} errorId={errorId} label="開始日" required>
          <Input
            aria-describedby={message === undefined ? undefined : errorId}
            aria-invalid={message !== undefined}
            defaultValue={from}
            id={fromId}
            max={to}
            name={PERIOD_KEY.FROM}
            required
            type="date"
          />
        </FormField>
      </div>
      <div className={FIELD_WIDTH}>
        <FormField controlId={toId} errorId={errorId} label="終了日" required>
          <Input
            aria-describedby={message === undefined ? undefined : errorId}
            aria-invalid={message !== undefined}
            defaultValue={to}
            id={toId}
            min={from}
            name={PERIOD_KEY.TO}
            required
            type="date"
          />
        </FormField>
      </div>
      <Button type="submit">この期間で見る</Button>
      {message === undefined ? null : (
        <p className="w-full text-sm text-destructive" id={errorId} role="alert">
          {message}
        </p>
      )}
    </form>
  );
}
