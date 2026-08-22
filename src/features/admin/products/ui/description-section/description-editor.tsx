"use client";

import dynamic from "next/dynamic";

/**
 * 編集面は、最初に読む一式から外す。
 *
 * @remarks
 * 静的に import すると、editor 一式（ProseMirror と拡張）が商品フォーム 2 画面の**最初の読み込み**
 * に乗ります。gzip で 195 KB あり、この 2 画面が同梱サンプルで最も重い理由でした
 * （[0101](../../../../../../docs/adr/0101-performance-budget.md) §4）。
 *
 * **「使うまで取りに行かない」ではありません。** `next/dynamic` が取得を始めるのは要素がマウント
 * した時点です。この欄を含む段は隠れていても DOM に残るため（`components/patterns/wizard-form/`）、
 * 取得は最初の描画の直後に始まります。得られるのは**最初に読む一式から外れること**であり、同じ
 * ページを開いた人は結局そのバイトを払います。
 *
 * **`ssr: false` で読みます。** 編集面は開いた時点の内容からしか組み立てられず、server で描いても
 * hydration でもう一度読むことになるため、初期の描画から外しても失うものがありません。
 */
export const ProductDescriptionEditor = dynamic(
  () =>
    import("@/components/design-system/rich-text/rich-text-editor/rich-text-editor").then(
      (module) => module.RichTextEditor,
    ),
  { ssr: false, loading: () => <ProductDescriptionEditorPlaceholder /> },
);

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
