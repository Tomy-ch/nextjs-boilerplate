"use client";

import { useActionState, useCallback, useId, useMemo, useState } from "react";

import { WizardForm } from "@/components/patterns/wizard-form/wizard-form";
import { idleActionState } from "@/model/action-state";

import type {
  CreateProductAction,
  ProductFormState,
  UploadProductImageAction,
} from "../form-state";
import { ProductBasicsSection } from "../ui/basics-section/basics-section";
import { ProductConfirmSection } from "../ui/confirm-section/confirm-section";
import { ProductDescriptionSection } from "../ui/description-section/description-section";
import { ProductFormFeedback } from "../ui/form-feedback/form-feedback";
import { ProductImagesSection } from "../ui/images-section/images-section";
import { ProductPublishSection } from "../ui/publish-section/publish-section";
import type { ProductSelectOption } from "../ui/select-field/select-field";
import { ProductSubmitButton } from "../ui/submit-button/submit-button";
import { useImageRejection } from "../use-image-rejection";
import { useProductImages } from "../use-product-images";
import { emptyProductValues, useProductValues } from "../use-product-values";
import { useUnsavedChanges } from "../use-unsaved-changes";

/** `AdminProductCreateView` の props。 */
export type AdminProductCreateViewProps = {
  /** 選べる分類。 */
  categoryOptions: readonly ProductSelectOption[];
  /** 選べる状態。 */
  statusOptions: readonly ProductSelectOption[];
  /** 受け付ける 1 枚あたりの大きさ（byte）。 */
  maxUploadBytes: number;
  /** 商品を作る送信先。 */
  createAction: CreateProductAction;
  /** 画像を送る送信先。 */
  uploadAction: UploadProductImageAction;
};

/**
 * 商品を作る画面。
 *
 * @remarks
 * **段階に分けて進みます。**初めての入力では「あとどれだけで送れるか」が要るためで、進捗と行き来
 * だけを `WizardForm` が持ちます。段の中身は編集の画面と同じ部品で、器だけが違います。
 *
 * **埋まっていない段からは進めません。**同じ規則を Server Action も通りますが、往復して初めて
 * 「入っていない」と言われるより、その場で判る方が直しやすいためです。誤りの文言は触れた項目から
 * 出します。開いた直後に空欄をすべて赤くすると、まだ何もしていない人に落ち度を告げることに
 * なります。
 *
 * **最後に確認の段を置きます。**作成は取り消せる操作ではなく、送る前に全体を一度読める場所が
 * 要ります。確認は入力欄を持たず、送ろうとしている値をそのまま出します。
 *
 * 入力欄へ native の `required` を与えません。隠れた段の欄が空だとブラウザが focus できず、送信が
 * 理由も示さずに止まります。
 *
 * 画像を送り終わるまで送信を止めます。載るのは保存済みのキーだけなので、途中で送ると、上げた
 * つもりの画像を持たない商品ができます。
 */
export function AdminProductCreateView({
  categoryOptions,
  createAction,
  maxUploadBytes,
  statusOptions,
  uploadAction,
}: AdminProductCreateViewProps) {
  const idPrefix = useId();
  const [state, formAction] = useActionState<ProductFormState, FormData>(
    createAction,
    idleActionState(),
  );
  const initialValues = useMemo(() => emptyProductValues(), []);
  const form = useProductValues(initialValues, { withQuantity: true });
  const images = useProductImages(uploadAction);
  const { onReject, rejection } = useImageRejection(maxUploadBytes);
  const [dismissed, setDismissed] = useState(false);

  useUnsavedChanges(form.dirty || images.items.length > 0);

  // 入力を直した時点で、直前の送信の結果は古くなる。出し続けると、直したのに直っていないよう
  // に見える。
  const dismiss = useCallback(() => setDismissed(true), []);
  const changeDescription = useCallback(
    (value: string) => {
      form.setValue("description", value);
      dismiss();
    },
    [dismiss, form],
  );

  return (
    <form action={formAction} className="grid gap-8" onInput={dismiss}>
      <ProductFormFeedback
        dismissed={dismissed}
        idPrefix={idPrefix}
        state={state}
        title="登録できませんでした"
      />
      <WizardForm
        label="商品の登録"
        steps={[
          {
            id: "basics",
            title: "基本情報",
            blocked: form.isSectionBlocked("basics"),
            content: (
              <ProductBasicsSection
                categoryOptions={categoryOptions}
                form={form}
                idPrefix={idPrefix}
                withQuantity={true}
              />
            ),
          },
          {
            id: "description",
            title: "説明",
            content: (
              <ProductDescriptionSection
                initialValue={initialValues.description}
                onValueChange={changeDescription}
                value={form.values.description}
              />
            ),
          },
          {
            id: "images",
            title: "画像",
            blocked: images.uploading,
            content: (
              <ProductImagesSection
                images={images}
                maxUploadBytes={maxUploadBytes}
                onReject={onReject}
                rejection={rejection}
              />
            ),
          },
          {
            id: "publish",
            title: "公開",
            blocked: form.isSectionBlocked("publish"),
            nextLabel: "確認",
            content: (
              <ProductPublishSection
                form={form}
                idPrefix={idPrefix}
                statusOptions={statusOptions}
              />
            ),
          },
          {
            id: "confirm",
            title: "確認",
            content: (
              <ProductConfirmSection
                categoryOptions={categoryOptions}
                imageCount={images.imagePaths.length}
                statusOptions={statusOptions}
                values={form.values}
              />
            ),
          },
        ]}
        submit={
          <ProductSubmitButton
            blocked={images.uploading}
            label="登録する"
            pendingLabel="登録しています…"
          />
        }
      />
    </form>
  );
}
