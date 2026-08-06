import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useCallback, useId, useState } from "react";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "../../design-system/form/field/field";
import { FileUpload } from "./file-upload";
import { FILE_UPLOAD_REJECTION_REASON, type FileUploadRejection } from "./file-upload.definition";

const MAX_SIZE = 2 * 1024 * 1024;

function toMessage(rejections: FileUploadRejection[]) {
  const hasType = rejections.some(
    (rejection) => rejection.reason === FILE_UPLOAD_REJECTION_REASON.TYPE,
  );

  return hasType ? "PNG または JPEG の画像を選んでください。" : "2 MB 以内の画像を選んでください。";
}

function ValidatedFileUpload() {
  const fieldId = useId();
  const [message, setMessage] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);

  const handleReject = useCallback(
    (rejections: FileUploadRejection[]) => setMessage(toMessage(rejections)),
    [],
  );
  const handleSelect = useCallback((files: File[]) => {
    setChosen(files.map((file) => file.name));
    setMessage(null);
  }, []);

  return (
    <Field className="w-96">
      <FieldLabel htmlFor={fieldId}>添付画像</FieldLabel>
      <FieldDescription>PNG または JPEG、2 MB まで。</FieldDescription>
      <FileUpload
        accept="image/png,image/jpeg"
        aria-invalid={message !== null}
        id={fieldId}
        maxSize={MAX_SIZE}
        name="image"
        onReject={handleReject}
        onSelect={handleSelect}
      />
      {message === null ? null : <FieldError>{message}</FieldError>}
      {chosen.length === 0 ? null : (
        <FieldDescription>{chosen.length} 件を送信できます。</FieldDescription>
      )}
    </Field>
  );
}

const meta = {
  title: "Form/FileUpload",
  component: FileUpload,
  parameters: { layout: "centered" },
  args: { accept: "image/png,image/jpeg", className: "w-96", name: "image" },
} satisfies Meta<typeof FileUpload>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定の形。選んだファイルの名前を控えめに並べる。 */
export const Default: Story = {};

/** 複数選択。`multiple` は native 属性としてそのまま働く。 */
export const Multiple: Story = { args: { multiple: true } };

/**
 * 送信前の検証と、その結果の表示。文言は component が持たず、`onReject` が渡す理由から
 * 呼び出し元が組み立てて `FieldError` に載せる。
 */
export const Validated: Story = { render: () => <ValidatedFileUpload /> };

/** 送信中。操作を止め、進捗を示す。 */
export const Pending: Story = { args: { pending: true, progress: 40 } };

/** 進捗を伴わない送信中。経路が進捗を返さない場合はこの形になる。 */
export const PendingWithoutProgress: Story = { args: { pending: true } };

/** 操作できない状態。 */
export const Disabled: Story = { args: { disabled: true } };

/** 文言を差し替えた場合。名前が連なるため短い語にする。 */
export const CustomLabels: Story = {
  args: { prompt: "PNG / JPEG、2 MB まで", triggerLabel: "画像を選ぶ" },
};
