import { Skeleton } from "@/components/design-system/status/skeleton/skeleton";

/** 新着の待機表示で並べる件数。折り返し 1 段分に留める。 */
const TEASER_COUNT = 4;

/** ランキングの待機表示で並べる行数。実際に載せる件数と揃える。 */
const RANKING_ROW_COUNT = 5;

/** 分類の待機表示で並べる数。数はバックエンド次第なので、帯の高さが伝わる分だけ出す。 */
const CATEGORY_COUNT = 6;

/**
 * トップの待機表示。
 *
 * @remarks
 * 節ごとに違う形で枠を出します。3 つとも同じ枠にすると、出てきた瞬間に高さが変わって
 * ページ全体が跳ねます。
 *
 * 見出しの文字は枠にしません。取得を待たずに確定している文言で、枠に置き換えると出てくる
 * ときに 2 度読ませることになります。
 */
export function HomeSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-10 py-4">
      <section>
        <h2 className="text-lg font-emphasis">新着商品</h2>
        <div className="@container/new-arrivals mt-4">
          <ul className="grid grid-cols-2 gap-4 @2xl/new-arrivals:grid-cols-4">
            {Array.from({ length: TEASER_COUNT }, (_, index) => index).map((index) => (
              <li className="overflow-hidden rounded-xl border" key={index}>
                <Skeleton className="aspect-square w-full rounded-none" />
                <div className="space-y-2 p-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section>
        <h2 className="text-lg font-emphasis">売上ランキング</h2>
        <ul className="mt-4 space-y-1">
          {Array.from({ length: RANKING_ROW_COUNT }, (_, index) => index).map((index) => (
            <li className="flex items-center gap-4 py-3" key={index}>
              <Skeleton className="size-6 shrink-0" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-12 shrink-0" />
              <Skeleton className="h-4 w-20 shrink-0" />
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="text-lg font-emphasis">カテゴリから探す</h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {Array.from({ length: CATEGORY_COUNT }, (_, index) => index).map((index) => (
            <li key={index}>
              <Skeleton className="h-6 w-24 rounded-full" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
