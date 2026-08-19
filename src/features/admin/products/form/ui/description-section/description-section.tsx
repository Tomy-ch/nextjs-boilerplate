"use client";

import { useState } from "react";
import { FieldDescription } from "@/components/design-system/form/field/field";
import { RichTextEditor } from "@/components/design-system/rich-text/rich-text-editor/rich-text-editor";

import { PRODUCT_FORM_NAMES } from "../../parse-product-form";

/** `ProductDescriptionSection` の props。 */
export type ProductDescriptionSectionProps = {
  /** 最初に入っている本文。保存済みの内容を編集する場合に渡す。 */
  defaultValue?: string | null;
};

/**
 * 商品の説明。
 *
 * @remarks
 * 編集面そのものは form の値を持たないため、**書いた内容を hidden の欄へ写して送ります**。編集面
 * が `textarea` ではないので、そのままでは送信に載りません。
 *
 * ここで送るのは HTML 文字列です。検査は表示の直前に行うもので、保存のときに一度通した値を以後
 * ずっと検査済みとして扱いません（`model/rich-text`）。
 */
export function ProductDescriptionSection({ defaultValue }: ProductDescriptionSectionProps) {
  const [html, setHtml] = useState(defaultValue ?? "");

  return (
    <div className="grid gap-2">
      <RichTextEditor
        defaultValue={defaultValue ?? undefined}
        label="商品説明"
        onChange={setHtml}
      />
      <FieldDescription>
        見出しと箇条書きで構造を付けられます。書いた形のまま買い手へ表示されます。
      </FieldDescription>
      <input name={PRODUCT_FORM_NAMES.description} type="hidden" value={html} />
    </div>
  );
}
