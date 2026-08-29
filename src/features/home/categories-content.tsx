import { getProductCategories } from "@/adapters/server/api/product-masters";
import { withScreenSpan } from "@/observability/render-span";
import { CategoryLinks } from "./ui/category-links/category-links";

/**
 * 分類の導線。取得を待たずに配れる節。
 *
 * @remarks
 * `Suspense` の外に置きます。分類はキャッシュを持つ取得なので
 * （[product-masters](../../adapters/server/api/product-masters.ts)）、要求を待たずに静的な殻へ
 * 入り、最初の HTML から辿れます（[0041](../../../docs/adr/0041-cache-components-decision.md)）。
 *
 * **失敗をこの節の中で畳みません。** 殻は組み立て時に作られてそのまま配られるため、ここで失敗を
 * 表示へ変えると、そのとき読めなかったという事実が次の再検証まで全員へ配られます。読めなければ
 * 組み立てを落とし、配らない側へ倒します。
 *
 * **配り始めたあとで分類が読めなくなっても画面は壊れません** —— 取り直しは背後で起き、失敗しても最後に
 * 読めた殻が出続けます。これは `masters` profile が `expire` を持たないことに乗っています。持たせると、
 * その時間トラフィックが途絶えた直後の 1 要求が同期で取り直しに行き、そこで失敗した分がこの route の
 * 外まで抜けます（`/` を覆う `error.tsx` はありません）。
 */
export const HomeCategoriesContent = withScreenSpan(
  "features/home/categories-content",
  async () => {
    return <CategoryLinks categories={await getProductCategories()} />;
  },
);
