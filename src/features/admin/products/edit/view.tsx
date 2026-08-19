"use client";

import Link from "next/link";
import { useActionState, useId, useState } from "react";
import { Button } from "@/components/design-system/action/button/button";
import {
  TabsClient,
  TabsClientContent,
  TabsClientList,
  TabsClientTrigger,
} from "@/components/design-system/navigation/tabs-client/tabs-client";
import { idleActionState } from "@/model/action-state";
import type { Product } from "@/model/product/product";

import { adminProductEditPath } from "../../paths";
import type {
  ProductFormState,
  UpdateProductAction,
  UploadProductImageAction,
} from "../form/form-state";
import { PRODUCT_FORM_NAMES } from "../form/parse-product-form";
import { ProductBasicsSection } from "../form/ui/basics-section/basics-section";
import { ProductDescriptionSection } from "../form/ui/description-section/description-section";
import { ProductFormFeedback } from "../form/ui/form-feedback/form-feedback";
import { ProductImagesSection } from "../form/ui/images-section/images-section";
import { ProductPublishSection } from "../form/ui/publish-section/publish-section";
import type { ProductSelectOption } from "../form/ui/select-field/select-field";
import { ProductSubmitButton } from "../form/ui/submit-button/submit-button";
import { useImageRejection } from "../form/use-image-rejection";
import { useProductImages } from "../form/use-product-images";
import { findFirstInvalidSection, PRODUCT_FORM_SECTIONS } from "../form/validation-errors";

/** `AdminProductEditView` の props。 */
export type AdminProductEditViewProps = {
  /** 編集する商品。読み込んだ時点の版を含む。 */
  product: Product;
  /** 選べる分類。 */
  categoryOptions: readonly ProductSelectOption[];
  /** 選べる状態。 */
  statusOptions: readonly ProductSelectOption[];
  /** 受け付ける 1 枚あたりの大きさ（byte）。 */
  maxUploadBytes: number;
  /** 商品を更新する送信先。 */
  updateAction: UpdateProductAction;
  /** 画像を送る送信先。 */
  uploadAction: UploadProductImageAction;
};

const TAB_LABELS = {
  basics: "基本情報",
  description: "説明",
  images: "画像",
  publish: "公開",
} as const satisfies Readonly<Record<(typeof PRODUCT_FORM_SECTIONS)[number], string>>;

/**
 * 商品を編集する画面。
 *
 * @remarks
 * **観点を切り替えて直します。**編集で主なのは 1 か所を直すことなので、順番を持つ器にすると
 * 直したい所へ行くのに段を踏まされます。段の中身は作る画面と同じ部品で、器だけが違います。
 *
 * **選んでいない観点も DOM に残します**（`forceMount`）。既定では外れるため、観点を切り替えた
 * 時点で入力途中の値が消え、送信にも載りません。残したうえで `hidden` を自分で渡すのは、
 * 「DOM に在る」ことと「見えている」ことが別だからです。
 *
 * **送信が弾かれたら、誤りのある観点へ移ります。**そうしないと、画面のどこも赤くないのに送信
 * だけが通らない状態になります。順番を持たない器は、進む前に止める `wizard` の仕組みを持たない
 * ためです。
 *
 * 読み込んだ時点の版を hidden の欄で持ち回ります。その間に別の人が更新していれば送信が拒まれ、
 * 読み込み直す導線を出します。
 */
export function AdminProductEditView({
  categoryOptions,
  maxUploadBytes,
  product,
  statusOptions,
  updateAction,
  uploadAction,
}: AdminProductEditViewProps) {
  const idPrefix = useId();
  const [state, formAction] = useActionState<ProductFormState, FormData>(
    updateAction,
    idleActionState(),
  );
  const images = useProductImages(uploadAction);
  const { onReject, rejection } = useImageRejection(maxUploadBytes);
  const [section, setSection] = useState<string>(PRODUCT_FORM_SECTIONS[0]);
  const [seenState, setSeenState] = useState(state);

  // 送信の結果が入れ替わった描画で観点を寄せる。effect にすると寄せる前の描画が一度挟まり、
  // 誤りのある欄が隠れたまま「どこも赤くないのに送信だけ通らない」画面が一瞬現れる。
  if (seenState !== state) {
    setSeenState(state);

    const invalidSection =
      state.status === "error" ? findFirstInvalidSection(state.fieldErrors) : undefined;

    if (invalidSection !== undefined) setSection(invalidSection);
  }

  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="grid gap-8">
      <input name="id" type="hidden" value={product.id} />
      <input name={PRODUCT_FORM_NAMES.version} type="hidden" value={product.version} />

      <ProductFormFeedback idPrefix={idPrefix} state={state} title="更新できませんでした">
        <Button asChild size="sm" variant="outline">
          <Link href={adminProductEditPath(product.id)}>読み込み直す</Link>
        </Button>
      </ProductFormFeedback>

      <TabsClient onValueChange={setSection} value={section}>
        <TabsClientList aria-label="編集する観点">
          {PRODUCT_FORM_SECTIONS.map((value) => (
            <TabsClientTrigger key={value} value={value}>
              {TAB_LABELS[value]}
            </TabsClientTrigger>
          ))}
        </TabsClientList>
        <TabsClientContent forceMount={true} hidden={section !== "basics"} value="basics">
          <ProductBasicsSection
            categoryOptions={categoryOptions}
            defaults={{
              categoryId: product.category.id,
              name: product.name,
              price: product.price,
              stockWarningThreshold: product.stockWarningThreshold,
            }}
            fieldErrors={fieldErrors}
            idPrefix={idPrefix}
            withQuantity={false}
          />
        </TabsClientContent>
        <TabsClientContent forceMount={true} hidden={section !== "description"} value="description">
          <ProductDescriptionSection defaultValue={product.description} />
        </TabsClientContent>
        <TabsClientContent forceMount={true} hidden={section !== "images"} value="images">
          <ProductImagesSection
            images={images}
            maxUploadBytes={maxUploadBytes}
            onReject={onReject}
            rejection={rejection}
          />
        </TabsClientContent>
        <TabsClientContent forceMount={true} hidden={section !== "publish"} value="publish">
          <ProductPublishSection
            defaults={{ publishedAt: product.publishedAt, statusId: product.status.id }}
            fieldErrors={fieldErrors}
            idPrefix={idPrefix}
            statusOptions={statusOptions}
          />
        </TabsClientContent>
      </TabsClient>

      <div>
        <ProductSubmitButton
          blocked={images.uploading}
          label="更新する"
          pendingLabel="更新しています…"
        />
      </div>
    </form>
  );
}
