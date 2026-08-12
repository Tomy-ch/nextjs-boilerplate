import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { NO_IMAGE_URL } from "@/model/media";
import type { Product } from "@/model/product/product";

import { ProductCard } from "./card";

const meta = {
  title: "Features/Products/List/Card",
  component: ProductCard,
  parameters: { layout: "centered" },
} satisfies Meta<typeof ProductCard>;

export default meta;
type Story = StoryObj<typeof meta>;

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: crypto.randomUUID(),
    name: "ワイヤレスイヤホン",
    description: "<p>ノイズキャンセリング対応</p>",
    price: "19.99",
    quantity: 12,
    stockWarningThreshold: null,
    status: { id: "s1", name: "公開" },
    category: { id: "c1", name: "オーディオ" },
    publishedAt: new Date("2026-07-01T00:00:00.000Z"),
    imagePaths: [],
    ...overrides,
  };
}

/** 既定。画像・分類・価格・在庫を 1 枚に収める。 */
export const Default: Story = {
  args: { imageUrl: null, product: product() },
};

/** 画像を持つ場合。枠の比率は先に確保され、読み込み後もレイアウトが動かない。 */
export const WithImage: Story = {
  args: { imageUrl: NO_IMAGE_URL, product: product() },
};

/** 在庫が無い場合。価格より先に在庫の状態が読めるよう、分類の隣へ添える。 */
export const OutOfStock: Story = {
  args: { imageUrl: null, product: product({ quantity: 0 }) },
};

/** 一覧の先頭に置く場合。LCP 候補として画像を preload する。 */
export const Leading: Story = {
  args: { imageUrl: NO_IMAGE_URL, leading: true, product: product() },
};
