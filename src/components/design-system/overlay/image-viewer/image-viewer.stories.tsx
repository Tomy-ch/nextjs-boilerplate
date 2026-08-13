import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { MediaImage } from "../../display/media-image/media-image";
import { MEDIA_IMAGE_ASPECT_RATIO } from "../../display/media-image/media-image.definition";
import { ImageViewer } from "./image-viewer";

const IMAGE_URL = "/src/components/design-system/display/media-image/invertocat.png";

const meta = {
  title: "Overlay/ImageViewer",
  component: ImageViewer,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "縮小版を押すと大きく開きます。**canvas 上で画像を押すと確認できます。**",
          "枠と比率は呼び出し元が決めるため、この部品は trigger の中身を受け取るだけです。",
        ].join(""),
      },
    },
  },
  args: {
    alt: "招き猫",
    src: IMAGE_URL,
  },
} satisfies Meta<typeof ImageViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** carousel に載せる想定の、比率を固定した縮小版。 */
export const Default: Story = {
  render: (args) => (
    <div className="w-72">
      <ImageViewer {...args}>
        <MediaImage
          alt={args.alt}
          className="rounded-lg border border-border"
          sizes="18rem"
          src={IMAGE_URL}
        />
      </ImageViewer>
    </div>
  ),
};

/** 正方形の枠に収めた縮小版。枠が変わっても拡大版の見え方は変わらない。 */
export const Square: Story = {
  render: (args) => (
    <div className="w-40">
      <ImageViewer {...args}>
        <MediaImage
          alt={args.alt}
          aspectRatio={MEDIA_IMAGE_ASPECT_RATIO.SQUARE}
          className="rounded-lg border border-border"
          sizes="10rem"
          src={IMAGE_URL}
        />
      </ImageViewer>
    </div>
  ),
};
