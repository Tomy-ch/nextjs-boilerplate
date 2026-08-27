"use client";

import type { ReactNode } from "react";

import {
  KeyValueEmpty,
  KeyValueItem,
  KeyValueLabel,
  KeyValueList,
  KeyValueValue,
} from "@/components/design-system/display/key-value-list/key-value-list";
import { RichTextContent } from "@/components/design-system/rich-text/rich-text-content/rich-text-content";
import { SanitizedRichText } from "@/model/rich-text/sanitized-rich-text";

import type { ProductValues } from "../../use-product-values";
import type { ProductSelectOption } from "../select-field/select-field";

/** `ProductConfirmDetails` の props。 */
export type ProductConfirmDetailsProps = {
  /** 送ろうとしている値。 */
  values: ProductValues;
  /** 選べる分類。識別子を名前へ直すのに使う。 */
  categoryOptions: readonly ProductSelectOption[];
  /** 選べる状態。識別子を名前へ直すのに使う。 */
  statusOptions: readonly ProductSelectOption[];
  /** 送信に載る画像の枚数。 */
  imageCount: number;
};

/** 識別子で選ばれた候補を、表示する文言へ直す。 */
function labelOf(options: readonly ProductSelectOption[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? "";
}

/** 値が空なら「未入力」として見せる。 */
function Row({ label, value }: { label: string; value: string }) {
  const shown = value === "" ? <KeyValueEmpty /> : value;

  return (
    <KeyValueItem>
      <KeyValueLabel>{label}</KeyValueLabel>
      <KeyValueValue>{shown}</KeyValueValue>
    </KeyValueItem>
  );
}

/** 空にはならない値を出す行。 */
function FilledRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <KeyValueItem>
      <KeyValueLabel>{label}</KeyValueLabel>
      <KeyValueValue>{children}</KeyValueValue>
    </KeyValueItem>
  );
}

/**
 * 送る前に内容を確かめる段。
 *
 * @remarks
 * **入力欄を持ちません。**同じ値を 2 か所で編集できると、どちらが送られるかを読む側が推測する
 * ことになります。直したい場合は前の段へ戻ります。
 *
 * 説明は表示側と同じ経路（sanitize してから描く）で出します。ここで見えないものは保存しても
 * 表示されません。
 */
export function ProductConfirmDetails({
  categoryOptions,
  imageCount,
  statusOptions,
  values,
}: ProductConfirmDetailsProps) {
  return (
    <div className="grid gap-6">
      <KeyValueList>
        <Row label="商品名" value={values.name} />
        <Row label="価格" value={values.price} />
        <Row label="在庫数" value={values.quantity} />
        <Row label="在庫警告の閾値" value={values.stockWarningThreshold} />
        <Row label="分類" value={labelOf(categoryOptions, values.categoryId)} />
        <Row label="状態" value={labelOf(statusOptions, values.statusId)} />
        <FilledRow label="公開日時">
          {values.publishedAt === "" ? "未公開のまま登録します" : values.publishedAt}
        </FilledRow>
        <FilledRow label="画像">{imageCount === 0 ? "登録しません" : `${imageCount} 枚`}</FilledRow>
      </KeyValueList>

      <div className="grid gap-2">
        <h3 className="font-emphasis text-sm">商品説明</h3>
        {values.description === "" ? (
          <p className="text-muted-foreground text-sm">入力されていません。</p>
        ) : (
          <RichTextContent
            className="rounded-md border border-border px-3 py-2"
            content={SanitizedRichText.from(values.description)}
          />
        )}
      </div>
    </div>
  );
}
