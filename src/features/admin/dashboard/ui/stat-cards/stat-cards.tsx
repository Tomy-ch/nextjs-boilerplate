import { Card } from "@/components/design-system/display/card/card";

import type { SummaryCard } from "../../summary-cards";

/** `StatCards` の props。 */
export type StatCardsProps = {
  /** 並べる数値カード。 */
  cards: readonly SummaryCard[];
  /** 一覧に名前を与える見出し。読み上げにだけ出す。 */
  label: string;
};

/**
 * 集計を数値で並べる枠。
 *
 * @remarks
 * `dl` で組みます。並んでいるのは「名前と、その名前が指す値」の組であり、見出しと本文でも
 * 表でもありません。読み上げでも組として伝わります。
 *
 * **注記を値と同じ枠に置きます。** 3 つの指標は母集団が違うため（`model/dashboard`）、注記が
 * カードの外にあると、どの数に掛かる断りなのかが位置から読めません。
 *
 * **狭い段でも 2 列を保ちます。** 4 枚を縦に積むと、この下に置く内訳が最初の画面から押し出され、
 * 数だけを見て帰る利用者にも巻き取りを強います。値は `tabular-nums` で桁を揃え、列が細くても
 * 隣と比べられるようにしています。
 *
 * @see Storybook `Page/Admin/Dashboard`
 */
export function StatCards({ cards, label }: StatCardsProps) {
  return (
    <section aria-label={label}>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {cards.map((card) => (
          <Card className="gap-1 px-4 py-4 lg:px-5 lg:py-5" key={card.id}>
            <dt className="text-sm text-muted-foreground">{card.label}</dt>
            <dd>
              <p className="text-2xl font-strong tabular-nums lg:text-3xl">{card.value}</p>
              <p className="mt-2 text-xs text-muted-foreground">{card.note}</p>
            </dd>
          </Card>
        ))}
      </dl>
    </section>
  );
}
