import Link from "next/link";
import { cn } from "@/components/cn";
import type { DashboardPeriod, DashboardSummaryQuery } from "@/model/dashboard/dashboard";

import { PERIOD_CHOICES, toPeriodHref } from "../../period";

/** `PeriodSwitch` の props。 */
export type PeriodSwitchProps = {
  /** いま選ばれている期間。 */
  current: DashboardPeriod;
  /** 選び直した先へ持ち越す条件。 */
  query: DashboardSummaryQuery;
};

const ITEM =
  "block rounded-md px-3 py-1.5 text-sm font-emphasis transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-active focus-visible:shadow-glow-primary";

/**
 * 集計対象期間を選び直す導線。
 *
 * @remarks
 * **link で組みます。** 選んだ期間は URL に載るので、選択は「この画面の状態」ではなく
 * 「どの画面を見ているか」です。tab や toggle にすると、同じ状態へ戻る手段が履歴と共有 URL の
 * 両方から失われます。
 *
 * `aria-current` でいま見ている項目を示します。色の違いだけで現在地を表すと、色を区別できない
 * 利用者に伝わりません（[0100](../../../../../../docs/adr/0100-accessibility-target.md)）。
 *
 * 日付の入力欄は持ちません。期間を指定したときだけ現れるものなので、選び直しの導線と一緒に
 * 出し入れすると、選択肢の並びが状態によって伸び縮みします。
 *
 * @see Storybook `Page/Admin/Analytics`
 */
export function PeriodSwitch({ current, query }: PeriodSwitchProps) {
  return (
    <nav aria-label="集計対象期間">
      <ul className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/40 p-1">
        {PERIOD_CHOICES.map((choice) => {
          const selected = choice.period === current;

          return (
            <li key={choice.period}>
              <Link
                aria-current={selected ? "page" : undefined}
                className={cn(
                  ITEM,
                  selected
                    ? "bg-background text-foreground shadow-panel"
                    : "text-muted-foreground hover:text-foreground",
                )}
                href={toPeriodHref(choice.period, query)}
              >
                {choice.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
