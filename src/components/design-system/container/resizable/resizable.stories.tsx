import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { MediaImage } from "../../display/media-image/media-image";
import { MEDIA_IMAGE_ASPECT_RATIO } from "../../display/media-image/media-image.definition";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./resizable";

const DESCRIPTION =
  "境界を掴んで動かすと、二つの pane が総量を分け合います。片方を広げた分だけもう片方が縮みます。";

function Note({ children }: { children: string }) {
  return <p className="p-4 text-muted-foreground text-sm">{children}</p>;
}

const meta = {
  title: "Container/Resizable",
  component: ResizablePanelGroup,
  parameters: { layout: "centered" },
  args: {
    className: "h-64 w-[36rem] rounded-md border border-border",
    children: (
      <>
        <ResizablePanel defaultSize="50%" minSize="20%">
          <MediaImage
            alt="サンプルのロゴ"
            aspectRatio={MEDIA_IMAGE_ASPECT_RATIO.SQUARE}
            className="h-full"
            sizes="18rem"
            src="/src/components/design-system/display/media-image/invertocat.png"
          />
        </ResizablePanel>
        <ResizableHandle aria-label="画像と説明の区切り" withHandle />
        <ResizablePanel minSize="20%">
          <Note>{DESCRIPTION}</Note>
        </ResizablePanel>
      </>
    ),
  },
} satisfies Meta<typeof ResizablePanelGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定の横並び。画像を引き伸ばして見る、という当てに沿った形。 */
export const Default: Story = {};

/** 縦積み。`orientation` が向きを決める。 */
export const Vertical: Story = {
  args: {
    children: (
      <>
        <ResizablePanel defaultSize="50%" minSize="20%">
          <Note>上の pane です。</Note>
        </ResizablePanel>
        <ResizableHandle aria-label="上下の区切り" withHandle />
        <ResizablePanel minSize="20%">
          <Note>{DESCRIPTION}</Note>
        </ResizablePanel>
      </>
    ),
    orientation: "vertical",
  },
};

/** 標識を置かない場合。境界は 1px しかないため、動かせることに気付きにくい。 */
export const WithoutHandle: Story = {
  args: {
    children: (
      <>
        <ResizablePanel defaultSize="50%" minSize="20%">
          <Note>標識が無い境界です。</Note>
        </ResizablePanel>
        <ResizableHandle aria-label="左右の区切り" />
        <ResizablePanel minSize="20%">
          <Note>{DESCRIPTION}</Note>
        </ResizablePanel>
      </>
    ),
  },
};

/** 畳める pane。`collapsible` と `collapsedSize` を指定する。 */
export const Collapsible: Story = {
  args: {
    children: (
      <>
        <ResizablePanel collapsedSize="0%" collapsible defaultSize="30%" minSize="15%">
          <Note>境界を左端まで寄せると畳まれます。</Note>
        </ResizablePanel>
        <ResizableHandle aria-label="補助と本文の区切り" withHandle />
        <ResizablePanel minSize="30%">
          <Note>{DESCRIPTION}</Note>
        </ResizablePanel>
      </>
    ),
  },
};

/** 三つ以上の pane。境界ごとに何と何を分けるのかを名前で示す。 */
export const ThreePanes: Story = {
  args: {
    children: (
      <>
        <ResizablePanel defaultSize="25%" minSize="15%">
          <Note>一つ目</Note>
        </ResizablePanel>
        <ResizableHandle aria-label="一つ目と二つ目の区切り" withHandle />
        <ResizablePanel defaultSize="50%" minSize="20%">
          <Note>二つ目</Note>
        </ResizablePanel>
        <ResizableHandle aria-label="二つ目と三つ目の区切り" withHandle />
        <ResizablePanel minSize="15%">
          <Note>三つ目</Note>
        </ResizablePanel>
      </>
    ),
  },
};

/** 動かせない境界。`disabled` を指定すると配分を変えられない。 */
export const DisabledHandle: Story = {
  args: {
    children: (
      <>
        <ResizablePanel defaultSize="50%" minSize="20%">
          <Note>配分は固定されています。</Note>
        </ResizablePanel>
        <ResizableHandle aria-label="左右の区切り" disabled withHandle />
        <ResizablePanel minSize="20%">
          <Note>{DESCRIPTION}</Note>
        </ResizablePanel>
      </>
    ),
  },
};
