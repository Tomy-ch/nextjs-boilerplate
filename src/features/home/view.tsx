import type {
  ProductCategory,
  ProductListItem,
  ProductRankingEntry,
} from "@/model/product/product";

import { CategoryLinks } from "./ui/category-links/category-links";
import { NewArrivals } from "./ui/new-arrivals/new-arrivals";
import { RankingList } from "./ui/ranking-list/ranking-list";
import { SectionFailure } from "./ui/section-failure/section-failure";

/**
 * 1 つの節の取得結果。
 *
 * @remarks
 * 失敗を例外ではなく値で持ちます。トップは系統ごとに成否が分かれる画面なので、投げてしまうと
 * 最初に落ちた 1 つが残りを道連れにします（[0080](../../../docs/adr/0080-error-handling.md)）。
 */
export type SectionState<T> =
  | { readonly status: "ready"; readonly value: T }
  | { readonly status: "failed"; readonly message: string };

/** `HomeView` の props。 */
export type HomeViewProps = {
  /** 新着商品。 */
  newArrivals: SectionState<readonly ProductListItem[]>;
  /** 売上ランキング。 */
  ranking: SectionState<readonly ProductRankingEntry[]>;
  /** 分類の導線。 */
  categories: SectionState<readonly ProductCategory[]>;
};

/**
 * トップの画面。
 *
 * @remarks
 * 取得を持ちません。3 つの節を受け取って積むだけにしてあるのは、節ごとの成否の組み合わせを
 * 取得なしで確かめられるようにするためです。
 *
 * 節の並びは、画像のある帯・行の帯・小さな導線の帯の順です。同じ密度の帯が続くと、どこまでが
 * 1 つの節なのかが読み取りにくくなります。
 */
export function HomeView({ newArrivals, ranking, categories }: HomeViewProps) {
  return (
    <div className="space-y-10 py-4">
      {newArrivals.status === "ready" ? (
        <NewArrivals items={newArrivals.value} />
      ) : (
        <SectionFailure label="新着商品" message={newArrivals.message} />
      )}
      {ranking.status === "ready" ? (
        <RankingList entries={ranking.value} />
      ) : (
        <SectionFailure label="売上ランキング" message={ranking.message} />
      )}
      {categories.status === "ready" ? (
        <CategoryLinks categories={categories.value} />
      ) : (
        <SectionFailure label="カテゴリ" message={categories.message} />
      )}
    </div>
  );
}
