import { getProductCategories } from "@/adapters/server/api/product-masters";
import { withScreenSpan } from "@/observability/render-span";
import { CategoryLinks } from "./ui/category-links/category-links";

/**
 * 分類の導線。取得を待たずに配れる節。
 *
 * @remarks
 * `Suspense` の外に置きます。分類はリクエストをまたいで残る取得なので
 * （[product-masters](../../adapters/server/api/product-masters.ts)）、要求を待たずに静的な殻へ
 * 入り、最初の HTML から辿れます（[0041](../../../docs/adr/0041-cache-components-decision.md)）。
 *
 * **失敗をこの節の中で畳みません。** 殻は組み立て時に一度作られてそのまま配られ続けるため、
 * ここで失敗を表示へ変えると、そのとき読めなかったという事実が次の再検証まで全員へ配られます。
 * 読めなければ組み立てを落とし、配らない側へ倒します。**代わりに、配り始めたあとで分類が読めなく
 * なっても画面は壊れません** —— 最後に読めた殻がそのまま出続けます。
 */
export const HomeCategoriesContent = withScreenSpan(
  "features/home/categories-content",
  async () => {
    return <CategoryLinks categories={await getProductCategories()} />;
  },
);
