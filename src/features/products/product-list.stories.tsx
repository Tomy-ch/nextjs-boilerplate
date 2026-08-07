import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { Product } from "@/model/product/product";

import { ProductList } from "./product-list";
import { ProductListError } from "./product-list-error";
import { ProductListSkeleton } from "./product-list-skeleton";

/** story では再試行の中身を持たない。押せることだけを見せる。 */
const noop = () => {};

const meta = {
  title: "Features/Products/ProductList",
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
    status: { id: "s1", name: "公開" },
    category: { id: "c1", name: "オーディオ" },
    publishedAt: new Date("2026-07-01T00:00:00.000Z"),
    imagePath: null,
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

/** 取得を待っている状態。並ぶものと同じ形・同じ段組みで枠だけを出す。 */
export const Loading: Story = {
  args: { items: [] },
  render: () => <ProductListSkeleton />,
};

/** 取得に失敗した状態。生のエラーは出さず、問い合わせ番号と再試行だけを示す。 */
export const Failed: Story = {
  args: { items: [] },
  render: () => (
    <ProductListError
      message="現在サービスを利用できません。しばらくしてから再試行してください。"
      digest="2741564515"
      onRetry={noop}
    />
  ),
};
