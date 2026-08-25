import { getProductCategories } from "@/adapters/server/api/product-masters";
import {
  getProductListPage,
  getProductRanking,
  PRODUCT_SORT,
} from "@/adapters/server/api/products";
import { getDefaultErrorMeta, resolveErrorMeta } from "@/errors/error-catalog";
import { ErrorKind } from "@/errors/error-kind";
import { getLogger, reportQuietly } from "@/logging/logging.server";
import { withScreenSpan } from "@/observability/render-span";
import { HomeView, type SectionState } from "./view";

/** ランキングに載せる件数。 */
const RANKING_LIMIT = 5;

/** 新着に載せる件数。段が最も多いときにちょうど 2 行になる。 */
const NEW_ARRIVAL_COUNT = 8;

/**
 * 1 系統の取得結果を、節が扱える形へ写す。
 *
 * @remarks
 * 表示する文言は分類から引きます。取得側のメッセージをそのまま出すと、バックエンドの都合が
 * 画面の文言になります（[0080](../../../docs/adr/0080-error-handling.md)）。
 */
function toSectionState<T>(section: string, settled: PromiseSettledResult<T>): SectionState<T> {
  if (settled.status === "fulfilled") {
    return { status: "ready", value: settled.value };
  }

  reportQuietly(() =>
    getLogger().warn("トップの節を読めませんでした", {
      section,
      cause: String(settled.reason),
    }),
  );

  return {
    status: "failed",
    message: (resolveErrorMeta(settled.reason) ?? getDefaultErrorMeta(ErrorKind.INTERNAL)).message,
  };
}

/**
 * トップの中身。取得と組み立てを行う。
 *
 * @remarks
 * 3 系統を並行して取得します。直列にすると、前の系統が返るまで次の取得が始まらず、待ち時間が
 * 3 つの合計になります。系統同士に依存はありません。
 *
 * `Promise.all` ではなく `allSettled` を使うのは、1 つの失敗で残りを捨てないためです。`all` は
 * 最初の失敗で待機を打ち切るため、成功した系統の結果が手元にあっても使えません。
 */
export const HomePageContent = withScreenSpan("features/home/page-content", async () => {
  const [newArrivals, ranking, categories] = await Promise.allSettled([
    getProductListPage({ first: NEW_ARRIVAL_COUNT, sort: PRODUCT_SORT.NEWEST }).then(
      (page) => page.items,
    ),
    getProductRanking({ limit: RANKING_LIMIT }),
    getProductCategories(),
  ]);

  return (
    <HomeView
      categories={toSectionState("categories", categories)}
      newArrivals={toSectionState("new-arrivals", newArrivals)}
      ranking={toSectionState("ranking", ranking)}
    />
  );
});
