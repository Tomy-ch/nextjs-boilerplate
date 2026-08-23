"use client";

import { FieldDescription } from "@/components/design-system/form/field/field";
import { PRODUCT_FORM_NAMES } from "../../form-names";
import { controlIdOf } from "../../form-sections";
import { ProductDescriptionEditor } from "./description-editor";

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
      <ProductDescriptionEditor
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
