import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Carousel, CarouselContent, CarouselItem } from "../../container/carousel/carousel";
import { MediaImage } from "../../display/media-image/media-image";
import { ImageViewer, type ViewableImage } from "./image-viewer";

const PHOTO = "/src/components/design-system/display/media-image/invertocat.png";

// 送った位置が見て分かるよう、枚数ぶん違う絵柄を並べる。
const IMAGES: readonly ViewableImage[] = [
  { src: PHOTO, alt: "1 枚目" },
  { src: "/globe.svg", alt: "2 枚目" },
  { src: "/window.svg", alt: "3 枚目" },
];

const meta = {
  title: "Overlay/ImageViewer",
  component: ImageViewer,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "縮小版を押すと大きく開き、開いたまま前後へ送れます。**canvas 上で画像を押すと確認できます。**",
          "枠と比率は呼び出し元が決めるため、この部品は trigger の中身を受け取るだけです。",
        ].join(""),
      },
    },
  },
  args: { images: IMAGES, index: 0, children: null },
} satisfies Meta<typeof ImageViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 単独で置いた縮小版。押すと 1 枚目から開く。 */
export const Default: Story = {
  args: { index: 0 },
  render: (args) => (
    <div className="w-72">
      <ImageViewer {...args}>
        <MediaImage
          alt={IMAGES[args.index]?.alt ?? ""}
          className="rounded-lg border border-border"
          sizes="18rem"
          src={IMAGES[args.index]?.src ?? null}
        />
      </ImageViewer>
    </div>
  ),
};

/** 途中の 1 枚から開く。押した位置から始まる。 */
export const OpensAtIndex: Story = {
  args: { index: 2 },
  render: Default.render,
};

/**
 * carousel に載せた場合。拡大版で送ってから閉じると、背後の carousel が
 * その位置へ寄る。**開いて右へ送り、閉じてから背後を見ると確認できる。**
 */
export const InsideCarousel: Story = {
  render: (args) => (
    <div className="w-96">
      <Carousel aria-label="招き猫">
        <CarouselContent>
          {IMAGES.map((image, position) => (
            <CarouselItem
              aria-label={`${position + 1} / ${IMAGES.length}`}
              id={`story-image-${position + 1}`}
              key={image.alt}
            >
              <ImageViewer images={args.images} index={position}>
                <MediaImage
                  alt={image.alt}
                  className="rounded-lg border border-border"
                  sizes="24rem"
                  src={image.src}
                />
              </ImageViewer>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  ),
};
