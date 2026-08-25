"use client";

import dynamic from "next/dynamic";

import type { RichTextEditorProps } from "@/components/design-system/rich-text/rich-text-editor/rich-text-editor";
import { useLatched } from "@/components/use-latched";

/**
 * 編集面は、最初に読む一式から外す。
 *
 * @remarks
 * 静的に import すると、editor 一式（ProseMirror と拡張）が商品フォーム 2 画面の**最初の読み込み**
 * に乗ります。同梱サンプルの実測で gzip 約 190 KB、この 2 画面で最も大きな一塊です。量は
 * `bundle-budget` の「遅延 JS」の列に出ます。
 *
 * **`ssr: false` で読みます。** 編集面は開いた時点の内容からしか組み立てられず、server で描いても
 * hydration でもう一度読むことになるため、初期の描画から外しても失うものがありません。
 */
const RichTextEditorLazy = dynamic(
  () =>
    import("@/components/design-system/rich-text/rich-text-editor/rich-text-editor").then(
      (module) => module.RichTextEditor,
    ),
  { ssr: false, loading: () => <ProductDescriptionEditorPlaceholder /> },
);

/** {@link ProductDescriptionEditor} の props。 */
export type ProductDescriptionEditorProps = RichTextEditorProps & {
  /**
   * この欄を含む段が開かれているか。
   *
   * @remarks
   * **開かれるまで読み込みを始めません。** `next/dynamic` は mount した時点で取りに行くので、
   * 隠れたまま DOM に残る器（tab）へ置くと、初期の一式から外しても**最初の読み込みの直後**に
   * 取得と実行が走ります。開いた人が払う待ちは減らないまま、`bundle-budget` の初期の列だけが
   * 減るという形になります。
   *
   * 段ごとに到達したものだけを mount する器（`components/patterns/wizard-form`）から使うときは、
   * 器の側が同じ判断を済ませているので `true` を渡します。
   */
  active: boolean;
};

/**
 * 商品説明の編集面。
 *
 * @remarks
 * **一度開いたら閉じません。** 編集面は `defaultValue` からしか組み立てられないため、隠れるたびに
 * 外すと、戻ったときに書いた内容が初期値へ戻ります。
 */
export function ProductDescriptionEditor({ active, ...props }: ProductDescriptionEditorProps) {
  return useLatched(active) ? (
    <RichTextEditorLazy {...props} />
  ) : (
    <ProductDescriptionEditorPlaceholder />
  );
}

/**
 * 編集面が読み込まれるまでの枠。
 *
 * @remarks
 * 出来上がりと同じ高さで置きます。toolbar の段（`size-8` のボタン + `p-1`）と本文の下限
 * （`min-h-40`）を写しており、届いた瞬間に下の要素が動きません。
 */
function ProductDescriptionEditorPlaceholder() {
  return (
    <div aria-hidden="true" className="rounded-md border border-border bg-background">
      <div className="h-10 border-border border-b" />
      <div className="min-h-40" />
    </div>
  );
}
