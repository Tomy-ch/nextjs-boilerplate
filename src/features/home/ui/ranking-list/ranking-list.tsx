import Link from "next/link";

import { Separator } from "@/components/design-system/display/separator/separator";
import type { ProductRankingEntry } from "@/model/product/product";
import { withPartSpan } from "@/observability/render-span";

/** `RankingList` の props。 */
export type RankingListProps = {
  /** 販売数量の降順で並んだ商品。空なら節ごと描かない。 */
  entries: readonly ProductRankingEntry[];
};

/**
 * 売上ランキング。
 *
 * @remarks
 * カードではなく行で並べます。ランキングの取得口が返すのは名前・価格・販売数量だけで画像を
 * 含まないため、カードにすると代替画像が並ぶだけの面積になります。順位の比較が主眼なので、
 * 縦に詰めて隣の行と見比べられる形にしています。
 *
 * `ol` で描くのは、並びそのものが情報だからです。読み上げでも順序付きの一覧として伝わります。
 * 順位の数字を装飾ではなく本文に置いているのも同じ理由です。
 *
 * 行全体を link にせず商品名だけを link にしています。販売数量は遷移先の説明ではないため、
 * 読み上げの名前に混ぜません。
 */
export const RankingList = withPartSpan(
  "features/home/ui/ranking-list/ranking-list",
  ({ entries }: RankingListProps) => {
    if (entries.length === 0) {
      return null;
    }

    return (
      <section>
        <h2 className="text-lg font-emphasis">売上ランキング</h2>
        <ol className="mt-4">
          {entries.map((entry, index) => (
            <li key={entry.productId}>
              {index === 0 ? null : <Separator />}
              <div className="flex items-center gap-4 py-3">
                <span className="w-6 shrink-0 text-center text-lg font-emphasis tabular-nums">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 break-words">
                  <Link
                    className="rounded-xs font-emphasis hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-active focus-visible:shadow-glow-primary"
                    href={`/products/${entry.productId}`}
                  >
                    {entry.name}
                  </Link>
                </span>
                <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
                  {entry.soldQuantity} 個
                </span>
                {/* 通貨は表示の直前で付ける。価格は decimal 文字列のまま持ち回っており、
                    数値へ変換するとサブセント精度が落ちる。 */}
                <span className="w-20 shrink-0 text-right font-emphasis tabular-nums">
                  {`$${entry.price}`}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </section>
    );
  },
);
