"use client";

import dynamic from "next/dynamic";

/**
 * 編集面は、最初に読む一式から外す。
 *
 * @remarks
 * 静的に import すると、editor 一式（ProseMirror と拡張）が商品フォーム 2 画面の**最初の読み込み**
 * に乗ります。同梱サンプルの実測で gzip 195 KB、この 2 画面で最も大きな一塊です
 * （自動では検証されない目安）。何が得られて何が得られないかは
 * [0101](../../../../../../docs/adr/0101-performance-budget.md) §4。
 *
 * この欄を含む段は隠れていても DOM に残るため（`components/patterns/wizard-form/`）、読み込みは
 * 最初の描画の直後に始まります。
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
