import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { ProductListItem } from "@/model/product/product";

import { NewArrivals } from "./new-arrivals";

const FRONT_IMAGE_URL = "/src/components/design-system/display/media-image/invertocat.png";

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
    imageUrl: FRONT_IMAGE_URL,
    ...overrides,
  };
}

const ITEMS: readonly ProductListItem[] = [
  item(),
  item({ name: "スマートウォッチ", price: "129.00", imageUrl: null }),
  item({ name: "USB-C ハブ", price: "45.50" }),
  item({
    name: "ノイズキャンセリング ヘッドホン（over-ear・第 3 世代・ケース同梱）",
    price: "349.00",
  }),
  item({ name: "編組ケーブル 2m", price: "0.99", imageUrl: null }),
  item({ name: "モバイルバッテリー", price: "59.99" }),
  item({ name: "スタンド", price: "24.00" }),
  item({ name: "キーボード", price: "89.00", imageUrl: null }),
];

const meta = {
  title: "Features/Home/NewArrivals",
  component: NewArrivals,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "段の数を器の幅で決めます。**canvas の幅を広げると 4 列になります。**",
          "一覧への導線を見出しの隣に置くのは、ここに並ぶのが先頭の数件だけだからです。",
        ].join(""),
      },
    },
  },
  args: { items: ITEMS },
} satisfies Meta<typeof NewArrivals>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定の件数が並んだ状態。 */
export const Default: Story = {};

/** 端数の件数。段が埋まらなくても左詰めで並ぶ。 */
export const Few: Story = {
  args: { items: ITEMS.slice(0, 3) },
};
