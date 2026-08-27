import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useCallback, useState } from "react";
import { ATTACHMENT_STATE } from "@/components/app-starter/attachment/attachment.definition";
import { FileUpload } from "@/components/app-starter/file-upload/file-upload";
import { SAMPLE_DOCUMENT_URL } from "~catalog/lib/sample-asset";
import { UploadPreview } from "./upload-preview";
import type { UploadPreviewItem } from "./upload-preview.definition";

const meta = {
  title: "Display/UploadPreview",
  component: UploadPreview,
  parameters: { layout: "centered" },
} satisfies Meta<typeof UploadPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

const ITEMS: UploadPreviewItem[] = [
  { description: "1.2 MB", id: "1", name: "cover.png" },
  { description: "0.9 MB", id: "2", name: "diagram.png" },
];

/** 選択中のファイルと、件ごとの取り消し。 */
export const Default: Story = {
  args: { items: ITEMS, onRemove: () => {} },
};

/** 差し替え・再試行も渡した場合。渡した操作の button だけが並ぶ。 */
export const AllActions: Story = {
  args: { items: ITEMS, onRemove: () => {}, onReplace: () => {}, onRetry: () => {} },
};

/** 操作を渡さない場合。確認だけの一覧になる。 */
export const ReadOnly: Story = { args: { items: ITEMS } };

/** 横の束。件数が増えても縦を取らない。縮小表示を上、操作を右上へ重ねる。 */
export const Row: Story = {
  args: {
    items: [
      {
        description: "1.2 MB",
        id: "1",
        name: "cover.png",
        preview: SAMPLE_DOCUMENT_URL,
      },
      {
        description: "0.9 MB",
        id: "2",
        name: "diagram-of-the-whole-system.png",
        preview: SAMPLE_DOCUMENT_URL,
      },
      { description: "0.4 MB", id: "3", name: "notes.png" },
    ],
    onMoveDown: () => {},
    onMoveUp: () => {},
    onRemove: () => {},
    orientation: "row",
  },
};

/** 並び順が意味を持つ場面。端の項目は、その先へ動かす操作を押せない。 */
export const Reorderable: Story = {
  args: { items: ITEMS, onMoveDown: () => {}, onMoveUp: () => {}, onRemove: () => {} },
};

/**
 * `state` 5 種。進行状況は `state` と文言の両方で示す。`state` だけでは支援技術へ伝わらない。
 * `uploading` / `processing` では再試行が spinner へ変わる。
 */
export const States: Story = {
  args: {
    items: [
      {
        description: "まだ送信していません",
        id: "1",
        name: "idle.png",
        state: ATTACHMENT_STATE.IDLE,
      },
      {
        description: "送信中です",
        id: "2",
        name: "uploading.png",
        state: ATTACHMENT_STATE.UPLOADING,
      },
      {
        description: "処理しています",
        id: "3",
        name: "processing.png",
        state: ATTACHMENT_STATE.PROCESSING,
      },
      { description: "送信しました", id: "4", name: "done.png", state: ATTACHMENT_STATE.DONE },
      {
        description: "送信に失敗しました",
        id: "5",
        name: "failed.png",
        state: ATTACHMENT_STATE.ERROR,
      },
    ],
    onRemove: () => {},
    onRetry: () => {},
  },
};

/**
 * 画像と、画像でないファイルが混ざる場合。`preview` を渡した行だけが縮小表示を持ち、渡さない
 * 行は名前と説明だけになる。ファイルの種類からアイコンを決めることはしない。
 */
export const MixedPreview: Story = {
  args: {
    items: [
      {
        description: "1.2 MB",
        id: "1",
        name: "cover.png",
        preview: SAMPLE_DOCUMENT_URL,
      },
      { description: "0.4 MB", id: "2", name: "handbook.pdf" },
    ],
    onRemove: () => {},
  },
};

/** 枠に収まらない名前と説明。省略は `Attachment` が行う。 */
export const Truncated: Story = {
  args: {
    items: [
      {
        description: "作成日 2026-08-04 / 3840 x 2160 / 12.4 MB / 未圧縮のまま送信します",
        id: "1",
        name: "scan-2026-08-04-original-uncompressed-4k-front-side.png",
      },
    ],
    onRemove: () => {},
  },
};

/** 送信中。一覧は残したまま操作だけを止める。 */
export const Pending: Story = {
  args: { items: ITEMS, onRemove: () => {}, pending: true },
};

function WiredFixture() {
  const [items, setItems] = useState<UploadPreviewItem[]>([]);
  const handleSelect = useCallback((files: File[]) => {
    setItems((current) => [
      ...current,
      ...files.map((file) => ({
        description: `${String(Math.round(file.size / 1024))} KB`,
        id: `${file.name}-${String(file.lastModified)}`,
        name: file.name,
        preview: file,
      })),
    ]);
  }, []);
  const handleRemove = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  return (
    <div className="grid w-80 gap-4">
      <FileUpload accept="image/*" multiple onSelect={handleSelect} />
      <UploadPreview items={items} onRemove={handleRemove} />
    </div>
  );
}

/**
 * `FileUpload` と繋いだ場合。選ぶ受け口は `FileUpload`、一覧と操作は `UploadPreview` が持ち、
 * 一覧そのものは呼び出し元の state にある。画像を選ぶと表示用 URL が作られ、取り消すと破棄される。
 */
export const WithFileUpload: Story = {
  args: { items: [] },
  render: () => <WiredFixture />,
};

function RetryFixture() {
  const [items, setItems] = useState<UploadPreviewItem[]>([
    {
      description: "送信に失敗しました",
      id: "1",
      name: "cover.png",
      state: ATTACHMENT_STATE.ERROR,
    },
  ]);
  const handleRemoveOne = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);
  const handleRetry = useCallback((id: string) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, description: "再送信しています", state: ATTACHMENT_STATE.UPLOADING }
          : item,
      ),
    );
    window.setTimeout(() => {
      setItems((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, description: "送信しました", state: ATTACHMENT_STATE.DONE }
            : item,
        ),
      );
    }, 2000);
  }, []);

  return <UploadPreview items={items} onRemove={handleRemoveOne} onRetry={handleRetry} />;
}

/**
 * 再試行を押した場合。押した位置の button が spinner へ変わり、呼び出し元が `state` を
 * `done` へ移すと再試行へ戻る。spinner は `state` によって出るため、終わりを決めるのは
 * 呼び出し元である。
 */
export const RetryInFlight: Story = {
  args: { items: [] },
  render: () => <RetryFixture />,
};
