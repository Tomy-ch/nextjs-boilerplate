"use client";

import {
  KeyValueEmpty,
  KeyValueItem,
  KeyValueLabel,
  KeyValueList,
  KeyValueValue,
} from "@/components/design-system/display/key-value-list/key-value-list";
import { RichTextContent } from "@/components/design-system/rich-text/rich-text-content/rich-text-content";
import { SanitizedRichText } from "@/model/rich-text/sanitized-rich-text";

import type { ProductFormSnapshot } from "../../form-snapshot";
import { toOptionLabel } from "../../form-snapshot";
import { PRODUCT_FORM_NAMES } from "../../parse-product-form";
import type { ProductSelectOption } from "../select-field/select-field";

/** `ProductConfirmSection` の props。 */
export type ProductConfirmSectionProps = {
  /** form に今入っている値。 */
  snapshot: ProductFormSnapshot;
  /** 選べる分類。識別子を名前へ直すのに使う。 */
  categoryOptions: readonly ProductSelectOption[];
  /** 選べる状態。識別子を名前へ直すのに使う。 */
  statusOptions: readonly ProductSelectOption[];
  /** 送信に載る画像の枚数。 */
  imageCount: number;
};

/** 値が空なら「未入力」として見せる。 */
function ValueOf({ value }: { value: string | undefined }) {
  if (value === undefined || value === "") return <KeyValueEmpty />;

  return <>{value}</>;
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
export function ProductConfirmSection({
  categoryOptions,
  imageCount,
  snapshot,
  statusOptions,
}: ProductConfirmSectionProps) {
  const description = snapshot[PRODUCT_FORM_NAMES.description] ?? "";

  return (
    <div className="grid gap-6">
      <KeyValueList>
        <KeyValueItem>
          <KeyValueLabel>商品名</KeyValueLabel>
          <KeyValueValue>
            <ValueOf value={snapshot[PRODUCT_FORM_NAMES.name]} />
          </KeyValueValue>
        </KeyValueItem>
        <KeyValueItem>
          <KeyValueLabel>価格</KeyValueLabel>
          <KeyValueValue>
            <ValueOf value={snapshot[PRODUCT_FORM_NAMES.price]} />
          </KeyValueValue>
        </KeyValueItem>
        <KeyValueItem>
          <KeyValueLabel>在庫数</KeyValueLabel>
          <KeyValueValue>
            <ValueOf value={snapshot[PRODUCT_FORM_NAMES.quantity]} />
          </KeyValueValue>
        </KeyValueItem>
        <KeyValueItem>
          <KeyValueLabel>在庫警告の閾値</KeyValueLabel>
          <KeyValueValue>
            <ValueOf value={snapshot[PRODUCT_FORM_NAMES.stockWarningThreshold]} />
          </KeyValueValue>
        </KeyValueItem>
        <KeyValueItem>
          <KeyValueLabel>分類</KeyValueLabel>
          <KeyValueValue>
            <ValueOf
              value={toOptionLabel(categoryOptions, snapshot[PRODUCT_FORM_NAMES.categoryId])}
            />
          </KeyValueValue>
        </KeyValueItem>
        <KeyValueItem>
          <KeyValueLabel>状態</KeyValueLabel>
          <KeyValueValue>
            <ValueOf value={toOptionLabel(statusOptions, snapshot[PRODUCT_FORM_NAMES.statusId])} />
          </KeyValueValue>
        </KeyValueItem>
        <KeyValueItem>
          <KeyValueLabel>公開日時</KeyValueLabel>
          <KeyValueValue>
            {snapshot[PRODUCT_FORM_NAMES.publishedAt] === undefined ||
            snapshot[PRODUCT_FORM_NAMES.publishedAt] === "" ? (
              "未公開のまま登録します"
            ) : (
              <ValueOf value={snapshot[PRODUCT_FORM_NAMES.publishedAt]} />
            )}
          </KeyValueValue>
        </KeyValueItem>
        <KeyValueItem>
          <KeyValueLabel>画像</KeyValueLabel>
          <KeyValueValue>{imageCount === 0 ? "登録しません" : `${imageCount} 枚`}</KeyValueValue>
        </KeyValueItem>
      </KeyValueList>

      <div className="grid gap-2">
        <h3 className="font-emphasis text-sm">商品説明</h3>
        {description === "" ? (
          <p className="text-muted-foreground text-sm">入力されていません。</p>
        ) : (
          <RichTextContent
            className="rounded-md border border-border px-3 py-2"
            content={SanitizedRichText.from(description)}
          />
        )}
      </div>
    </div>
  );
}
