import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { MediaImage } from "./media-image";
import { MEDIA_IMAGE_ASPECT_RATIO } from "./media-image.definition";

const SAMPLE_SRC = "/src/components/design-system/display/media-image/invertocat.png";

const meta = {
  title: "Display/MediaImage",
  component: MediaImage,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "`next/image` に、比率の固定・読み込み中の CSS Skeleton・LCP 用の preload を一貫して",
          "適用します。**読み込み中の見え方は canvas に出ません。** story を開いた時点で画像は",
          "取得済みで、skeleton は最初の描画の一瞬しか存在しないためです。実際の見え方は",
          "browser の devtools で通信を絞って確認します。",
          "`sizes` は呼び出し元が渡します。実際の表示幅と食い違うと、必要より大きい画像を",
          "取りに行くか、粗い画像が引き伸ばされます。",
        ].join(""),
      },
    },
  },
  args: { alt: "サンプルのロゴ", className: "w-80", sizes: "20rem", src: SAMPLE_SRC },
} satisfies Meta<typeof MediaImage>;
export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。比率を指定しない場合は画像本来の比率で表示する。 */
export const Default: Story = {};

/** 比率を固定する場合。枠が先に確保されるため、読み込み後にレイアウトが動かない。 */
export const FixedAspectRatio: Story = {
  args: { aspectRatio: MEDIA_IMAGE_ASPECT_RATIO.WIDE },
};

/**
 * LCP になる画像。`preload` を指定した画像だけが先に取得される。**画面で最も大きい 1 枚に限る。**
 * 複数へ付けると帯域を奪い合い、どれも遅くなる。
 */
export const Preloaded: Story = {
  args: { aspectRatio: MEDIA_IMAGE_ASPECT_RATIO.WIDE, preload: true },
};

/**
 * ぼかした縮小画像を先に出す場合。`blurDataURL` を渡した場合だけ CSS Skeleton の代わりに使われる。
 * この story の値は 1px の透明 GIF なので、見た目は単色になる。
 */
export const BlurPlaceholder: Story = {
  args: {
    blurDataURL: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
    placeholder: "blur",
  },
};
