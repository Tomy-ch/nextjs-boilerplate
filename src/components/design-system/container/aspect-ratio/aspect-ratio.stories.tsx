import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  MEDIA_IMAGE_ASPECT_RATIO,
  MEDIA_IMAGE_ASPECT_RATIO_CLASS,
} from "../../display/media-image/media-image.definition";
import { AspectRatio } from "./aspect-ratio";

const meta = {
  title: "Container/AspectRatio",
  component: AspectRatio,
  parameters: { layout: "centered" },
} satisfies Meta<typeof AspectRatio>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 16:9 の枠。 */
export const Default: Story = {
  render: () => (
    <div className="w-80">
      <AspectRatio
        className="flex items-center justify-center rounded-md bg-muted text-foreground"
        ratio={16 / 9}
      >
        16 : 9
      </AspectRatio>
    </div>
  ),
};

/** 任意の比率を数値で指定できる。 */
export const CustomRatio: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-3">
      <AspectRatio
        className="flex items-center justify-center rounded-md bg-muted text-foreground"
        ratio={21 / 9}
      >
        21 : 9
      </AspectRatio>
      <AspectRatio className="flex items-center justify-center rounded-md bg-muted text-foreground">
        1 : 1（既定）
      </AspectRatio>
    </div>
  ),
};

/** 内容が枠より高くても比率を保ち、はみ出しを切る。 */
export const OverflowingContent: Story = {
  render: () => (
    <div className="w-80">
      <AspectRatio className="rounded-md bg-muted p-2 text-foreground" ratio={16 / 9}>
        <p>この内容は枠の高さより長くなります。</p>
        <p>2 行目。</p>
        <p>3 行目。</p>
        <p>4 行目。</p>
        <p>5 行目。</p>
      </AspectRatio>
    </div>
  ),
};

/** 高さが決まった親の中では、高さから幅を決める。 */
export const InFixedHeightParent: Story = {
  render: () => (
    <div className="flex h-32 w-96 items-stretch rounded-md border border-border p-2">
      <AspectRatio
        className="flex items-center justify-center rounded-md bg-muted text-foreground"
        ratio={16 / 9}
      >
        親の高さに収まる
      </AspectRatio>
    </div>
  ),
};

/** `MediaImage` と枠を揃える場合は class を直接当てる方が軽い。 */
export const SharedWithMediaImage: Story = {
  render: () => (
    <div
      className={`${MEDIA_IMAGE_ASPECT_RATIO_CLASS[MEDIA_IMAGE_ASPECT_RATIO.WIDE]} flex w-80 items-center justify-center rounded-md bg-muted text-foreground`}
    >
      MEDIA_IMAGE_ASPECT_RATIO_CLASS.wide
    </div>
  ),
};
