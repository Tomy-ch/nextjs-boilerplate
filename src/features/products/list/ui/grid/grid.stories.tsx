import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { ProductListItem } from "@/model/product/product";

import { ProductGrid } from "./grid";

const meta = {
  title: "Features/Products/List/Grid",
  component: ProductGrid,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "段の数を器の幅で決めます。**canvas の幅を広げると 2 列になります。**",
          "脇に絞り込みが常設される幅では本文の取り分が狭くなるため、viewport では決められません。",
        ].join(""),
      },
    },
  },
} satisfies Meta<typeof ProductGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

let seq = 0;

function item(overrides: Partial<ProductListItem> = {}): ProductListItem {
  seq += 1;

  return {
    id: `0195f0c2-0000-7000-8000-${String(seq).padStart(12, "0")}`,
    name: "ワイヤレスイヤホン",
    price: "19.99",
    quantity: 12,
    categoryName: "オーディオ",
    statusName: "公開",
    imageUrl: null,
    ...overrides,
  };
}

/** 商品が並んでいる状態。 */
export const Default: Story = {
  args: {
    items: [
      item(),
      item({ name: "スマートウォッチ", price: "129.00" }),
      item({ name: "USB-C ハブ", price: "45.50", quantity: 0, statusName: "在庫切れ" }),
    ],
  },
};

/** 条件に合う商品が無い状態。次に何をすればよいかを添える。 */
export const Empty: Story = {
  args: { items: [] },
};

/** 1 件だけの状態。段組みが崩れて横いっぱいに伸びないことを見る。 */
export const SingleItem: Story = {
  args: { items: [item()] },
};
