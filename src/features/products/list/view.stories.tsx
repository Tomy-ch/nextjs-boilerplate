import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { Product } from "@/model/product/product";

import { ProductList } from "./view";

const meta = {
  title: "Features/Products/List/View",
  component: ProductList,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ProductList>;

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

/** 商品が並んでいる状態。 */
export const Default: Story = {
  args: {
    items: [
      { product: product(), imageUrl: null },
      { product: product({ name: "スマートウォッチ", price: "129.00" }), imageUrl: null },
      {
        product: product({ name: "USB-C ハブ", price: "45.50", quantity: 0 }),
        imageUrl: null,
      },
    ],
  },
};

/** 条件に合う商品が無い状態。次に何をすればよいかを添える。 */
export const Empty: Story = {
  args: { items: [] },
};
