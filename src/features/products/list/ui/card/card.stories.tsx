import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { MEDIA_IMAGE_PRIORITY } from "@/components/design-system/display/media-image/media-image.definition";
import { NO_IMAGE_URL } from "@/model/media";
import type { ProductListItem } from "@/model/product/product";
import { toProductId } from "@/model/product/product";

import { ProductCard } from "./card";

const meta = {
  title: "Features/Products/List/Card",
  component: ProductCard,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "器の幅で縦横が変わります。**canvas の幅を狭めると画像が上へ回ります。**",
          "同じカードが一覧本体にも狭い領域にも並ぶため、viewport ではなく器で分岐します。",
        ].join(""),
      },
    },
  },
} satisfies Meta<typeof ProductCard>;

export default meta;
type Story = StoryObj<typeof meta>;

function item(overrides: Partial<ProductListItem> = {}): ProductListItem {
  return {
    id: toProductId("0195f0c2-0000-7000-8000-000000000001"),
    name: "ワイヤレスイヤホン",
    price: "19.99",
    quantity: 12,
    categoryName: "オーディオ",
    statusName: "公開",
    imageUrl: null,
    ...overrides,
  };
}

/** 既定。画像・分類・状態・価格・在庫を 1 枚に収める。 */
export const Default: Story = {
  args: { item: item() },
};

/** 画像を持つ場合。枠の比率は先に確保され、読み込み後もレイアウトが動かない。 */
export const WithImage: Story = {
  args: { item: item({ imageUrl: NO_IMAGE_URL }) },
};

/** 在庫が無い場合。価格より先に在庫の状態が読めるよう、分類の隣へ添える。 */
export const OutOfStock: Story = {
  args: { item: item({ quantity: 0, statusName: "在庫切れ" }) },
};

/** 一覧の先頭に置く場合。LCP 候補として画像を preload する。 */
export const Leading: Story = {
  args: { imagePriority: MEDIA_IMAGE_PRIORITY.PRELOAD, item: item({ imageUrl: NO_IMAGE_URL }) },
};

/** 狭い器に置いた場合。画像が上へ回り、1 列に積まれる。 */
export const NarrowContainer: Story = {
  args: { item: item({ imageUrl: NO_IMAGE_URL }) },
  decorators: [(Story) => <div className="w-72">{Story()}</div>],
};

/** 上限いっぱいの名前と分類名。折り返しても価格と在庫の行が押し出されない。 */
export const MaxLength: Story = {
  args: {
    item: item({
      name: "超高性能ワイヤレスノイズキャンセリングイヤホン-第3世代-ProMaxUltraEdition".repeat(3),
      categoryName: "オーディオ関連機器およびアクセサリ全般",
      price: "999999999.999",
    }),
  },
};
