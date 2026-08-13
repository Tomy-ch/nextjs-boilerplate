import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { ProductRankingEntry } from "@/model/product/product";

import { RankingList } from "./ranking-list";

/** 契約が許す最大長。`name` は 255（`src/adapters/gen/api/endpoints.zod.ts`）。 */
const MAX_NAME_LENGTH = 255;

function longText(length: number): string {
  const unit = "超高性能ワイヤレスノイズキャンセリングイヤホン-第3世代-ProMaxUltraEdition-";

  return unit.repeat(Math.ceil(length / unit.length)).slice(0, length);
}

let seq = 0;

function entry(overrides: Partial<ProductRankingEntry> = {}): ProductRankingEntry {
  seq += 1;

  return {
    productId: `0195f0c2-0000-7000-8000-${String(seq).padStart(12, "0")}`,
    name: "ワイヤレスイヤホン",
    price: "19.99",
    soldQuantity: 128,
    ...overrides,
  };
}

const ENTRIES: readonly ProductRankingEntry[] = [
  entry(),
  entry({ name: "スマートウォッチ", price: "129.00", soldQuantity: 96 }),
  entry({ name: "USB-C ハブ", price: "45.50", soldQuantity: 54 }),
  entry({ name: "編組ケーブル 2m", price: "0.99", soldQuantity: 12 }),
  entry({ name: "モバイルバッテリー", price: "1299.00", soldQuantity: 3 }),
];

const meta = {
  title: "Features/Home/RankingList",
  component: RankingList,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "カードではなく行で並べます。ランキングの取得口は画像を返さないため、",
          "カードにすると代替画像が並ぶだけの面積になります。",
        ].join(""),
      },
    },
  },
  args: { entries: ENTRIES },
} satisfies Meta<typeof RankingList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 上位 5 件が並んだ状態。 */
export const Default: Story = {};

/** 名前が契約の上限まで長い商品が混ざった状態。数量と価格の桁位置を保つ。 */
export const LongName: Story = {
  args: {
    entries: [entry({ name: longText(MAX_NAME_LENGTH) }), ...ENTRIES.slice(1)],
  },
};
