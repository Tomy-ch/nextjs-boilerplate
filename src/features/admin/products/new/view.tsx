"use client";

import type { SyntheticEvent } from "react";
import { useActionState, useCallback, useId, useState } from "react";
import { WizardForm } from "@/components/patterns/wizard-form/wizard-form";
import { idleActionState } from "@/model/action-state";
import type { ProductFormSnapshot } from "../form/form-snapshot";
import { readProductFormSnapshot } from "../form/form-snapshot";
import type {
  CreateProductAction,
  ProductFormState,
  UploadProductImageAction,
} from "../form/form-state";
import { ProductBasicsSection } from "../form/ui/basics-section/basics-section";
import { ProductConfirmSection } from "../form/ui/confirm-section/confirm-section";
import { ProductDescriptionSection } from "../form/ui/description-section/description-section";
import { ProductFormFeedback } from "../form/ui/form-feedback/form-feedback";
import { ProductImagesSection } from "../form/ui/images-section/images-section";
import { ProductPublishSection } from "../form/ui/publish-section/publish-section";
import type { ProductSelectOption } from "../form/ui/select-field/select-field";
import { ProductSubmitButton } from "../form/ui/submit-button/submit-button";
import { useImageRejection } from "../form/use-image-rejection";
import { useProductImages } from "../form/use-product-images";

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
 * **最後に確認の段を置きます。**作成は取り消せる操作ではなく、送る前に全体を一度読める場所が
 * 要ります。確認は入力欄を持たず、form そのものから読んだ値を出すため、確認に出る内容と送られる
 * 内容が食い違いません。
 *
 * 表示していない段も DOM に残るので、送信は最後に 1 回で全段ぶんまとまります。そのため入力欄へ
 * native の `required` を与えません。隠れた段の欄が空だとブラウザが focus できず、送信が理由も
 * 示さずに止まります。空欄の指摘は送信の結果として返します。
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
  const images = useProductImages(uploadAction);
  const { onReject, rejection } = useImageRejection(maxUploadBytes);
  const [snapshot, setSnapshot] = useState<ProductFormSnapshot>({});

  // 確認の段は form そのものを読む。入力欄を 1 つずつ写しに持つと、写し忘れた欄が確認に
  // 現れないまま送られる。
  const captureSnapshot = useCallback((event: SyntheticEvent<HTMLFormElement>) => {
    setSnapshot(readProductFormSnapshot(event.currentTarget));
  }, []);

  return (
    <form action={formAction} className="grid gap-8" onInput={captureSnapshot}>
      <ProductFormFeedback idPrefix={idPrefix} state={state} title="登録できませんでした" />
      <WizardForm
        label="商品の登録"
        steps={[
          {
            id: "basics",
            title: "基本情報",
            content: (
              <ProductBasicsSection
                categoryOptions={categoryOptions}
                fieldErrors={state.status === "error" ? state.fieldErrors : undefined}
                idPrefix={idPrefix}
                withQuantity={true}
              />
            ),
          },
          {
            id: "description",
            title: "説明",
            content: <ProductDescriptionSection />,
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
            nextLabel: "確認",
            content: (
              <ProductPublishSection
                fieldErrors={state.status === "error" ? state.fieldErrors : undefined}
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
                snapshot={snapshot}
                statusOptions={statusOptions}
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
