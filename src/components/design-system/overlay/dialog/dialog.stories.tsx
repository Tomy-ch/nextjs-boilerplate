import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useId } from "react";

import { Button } from "../../action/button/button";
import { MediaImage } from "../../display/media-image/media-image";
import { MEDIA_IMAGE_ASPECT_RATIO } from "../../display/media-image/media-image.definition";
import { Input } from "../../form/input/input";
import { Label } from "../../form/label/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

function DetailDialog({ defaultOpen = false }: { defaultOpen?: boolean }) {
  return (
    <Dialog defaultOpen={defaultOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">詳細を見る</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>表示条件</DialogTitle>
          <DialogDescription>
            条件を満たす項目だけを一覧に表示します。条件は保存されません。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">閉じる</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog() {
  const nameId = useId();

  return (
    <Dialog defaultOpen>
      <DialogTrigger asChild>
        <Button variant="outline">名称を編集</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>名称の編集</DialogTitle>
          <DialogDescription>保存すると一覧の表示名が変わります。</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor={nameId}>名称</Label>
          <Input defaultValue="標準プラン" id={nameId} name="name" />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">キャンセル</Button>
          </DialogClose>
          <Button type="submit">保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DescriptionlessDialog() {
  return (
    <Dialog defaultOpen>
      <DialogTrigger asChild>
        <Button variant="outline">画像を見る</Button>
      </DialogTrigger>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>画像の拡大表示</DialogTitle>
        </DialogHeader>
        <MediaImage
          alt="サンプルのロゴ"
          aspectRatio={MEDIA_IMAGE_ASPECT_RATIO.SQUARE}
          sizes="28rem"
          src="/src/components/design-system/display/media-image/invertocat.png"
        />
      </DialogContent>
    </Dialog>
  );
}

function CustomCloseDialog() {
  return (
    <Dialog defaultOpen>
      <DialogTrigger asChild>
        <Button variant="outline">確認する</Button>
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>入力内容の確認</DialogTitle>
          <DialogDescription>内容を確認してから閉じてください。</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button>確認した</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const meta = {
  title: "Overlay/Dialog",
  component: Dialog,
  parameters: {
    docs: { story: { inline: false, iframeHeight: 420 } },
    layout: "centered",
  },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** trigger を操作して開く基本構成。 */
export const Default: Story = { render: () => <DetailDialog /> };

/** 開いた状態の title・説明・footer の構成。 */
export const Open: Story = { render: () => <DetailDialog defaultOpen /> };

/** 通常の編集操作に使う場合。入力は native form へ委ねる。 */
export const WithFormControls: Story = { render: () => <EditDialog /> };

/** 説明が不要な場合。`aria-describedby={undefined}` を明示する。 */
export const WithoutDescription: Story = { render: () => <DescriptionlessDialog /> };

/** 右上の閉じる操作を置かず、footer の操作だけで閉じる場合。 */
export const WithoutCloseButton: Story = { render: () => <CustomCloseDialog /> };
