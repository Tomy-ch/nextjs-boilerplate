"use client";

import dynamic from "next/dynamic";

import { FieldDescription } from "@/components/design-system/form/field/field";
import { PRODUCT_FORM_NAMES } from "../../form-names";
import { controlIdOf } from "../../form-sections";

/**
 * 編集面は、最初に読む一式から外す。
 *
 * @remarks
 * 静的に import すると、editor 一式（ProseMirror と拡張）が商品フォーム 2 画面の**最初の読み込み**
 * に乗ります。gzip で 195 KB あり、この 2 画面が同梱サンプルで最も重い理由でした
 * （[0101](../../../../../../docs/adr/0101-performance-budget.md) §4）。
 *
 * **「使うまで取りに行かない」ではありません。** `next/dynamic` が取得を始めるのは要素がマウント
 * した時点です。この欄を含む段は隠れていても DOM に残るため（`wizard-form.tsx`）、取得は最初の
 * 描画の直後に始まります。得られるのは**最初に読む一式から外れること**であり、同じページを開いた
 * 人は結局そのバイトを払います。
 *
 * **`ssr: false` で読みます。** 編集面は開いた時点の内容からしか組み立てられず、server で描いても
 * hydration でもう一度読むことになるため、初期の描画から外しても失うものがありません。書いた値は
 * 下の hidden の欄が持つので、読み終わる前に送信しても内容は落ちません。
 */
const RichTextEditor = dynamic(
  () =>
    import("@/components/design-system/rich-text/rich-text-editor/rich-text-editor").then(
      (module) => module.RichTextEditor,
    ),
  { ssr: false, loading: () => <RichTextEditorPlaceholder /> },
);

/**
 * 編集面が読み込まれるまでの枠。
 *
 * @remarks
 * 出来上がりと同じ高さで置きます。toolbar の段（`size-8` のボタン + `p-1`）と本文の下限
 * （`min-h-40`）を写しており、届いた瞬間に下の要素が動きません。
 */
function RichTextEditorPlaceholder() {
  return (
    <div aria-hidden="true" className="rounded-md border border-border bg-background">
      <div className="h-10 border-border border-b" />
      <div className="min-h-40" />
    </div>
  );
}

/** `ProductDescriptionSection` の props。 */
export type ProductDescriptionSectionProps = {
  /** 入力欄の `id` の前置き。 */
  idPrefix: string;
  /** 最初に表示する本文。編集面はここからしか初期化されない。 */
  initialValue: string;
  /** 今の本文。送信に載せる値でもある。 */
  value: string;
  /** 本文が変わったことを伝える。 */
  onValueChange: (value: string) => void;
};

/**
 * 商品の説明。
 *
 * @remarks
 * 編集面そのものは form の値を持たないため、**書いた内容を hidden の欄へ写して送ります**。編集面
 * が `textarea` ではないので、そのままでは送信に載りません。
 *
 * `initialValue` と `value` を分けるのは、編集面が**開いた時点の内容からしか組み立てられない**
 * ためです。送信のたびに今の値を初期値として渡し直すと、編集面が作り直されて caret が先頭へ
 * 飛びます。
 *
 * ここで送るのは HTML 文字列です。検査は表示の直前に行うもので、保存のときに一度通した値を以後
 * ずっと検査済みとして扱いません（`model/rich-text`）。
 */
export function ProductDescriptionSection({
  idPrefix,
  initialValue,
  onValueChange,
  value,
}: ProductDescriptionSectionProps) {
  return (
    <div className="grid gap-2">
      <RichTextEditor
        defaultValue={initialValue}
        id={controlIdOf(idPrefix, "description")}
        label="商品説明"
        onChange={onValueChange}
      />
      <FieldDescription>
        見出しと箇条書きで構造を付けられます。書いた形のまま買い手へ表示されます。
      </FieldDescription>
      <input name={PRODUCT_FORM_NAMES.description} type="hidden" value={value} />
    </div>
  );
}
