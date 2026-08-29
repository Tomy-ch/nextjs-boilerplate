import { getProductCategories } from "@/adapters/server/api/product-masters";
import { withScreenSpan } from "@/observability/render-span";
import { CategoryLinks } from "./ui/category-links/category-links";

/**
 * 分類の導線。取得を待たずに配れる節。
 *
 * @remarks
 * `Suspense` の外に置きます。取得がキャッシュを持つので
 * （[product-masters](../../adapters/server/api/product-masters.ts)）、待つ理由がありません。
 *
 * **失敗をこの節の中で畳みません。** 畳むと、そのとき読めなかったという事実が殻に焼かれて次の再検証まで
 * 配られます。読めなければ組み立てを落とし、配らない側へ倒します（この扱いが成り立つ条件は
 * [README](./README.md) の「運用」節と [`/` の仕様書](../../../docs/spec/route/shop/page.function.md)）。
 */
export const HomeCategoriesContent = withScreenSpan(
  "features/home/categories-content",
  async () => {
    return <CategoryLinks categories={await getProductCategories()} />;
  },
);
