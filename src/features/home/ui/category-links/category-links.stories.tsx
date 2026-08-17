import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { ProductCategory } from "@/model/product/product";

import { CategoryLinks } from "./category-links";

const CATEGORIES: readonly ProductCategory[] = [
  { id: "c1", code: 10, name: "オーディオ" },
  { id: "c2", code: 20, name: "ウェアラブル" },
  { id: "c3", code: 30, name: "アクセサリ" },
  { id: "c4", code: 40, name: "PC 周辺機器" },
  { id: "c5", code: 50, name: "スマートホーム" },
  { id: "c6", code: 60, name: "カメラ・映像機器" },
];

const meta = {
  title: "Features/Home/CategoryLinks",
  component: CategoryLinks,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "遷移先の URL は一覧の面（`products/facade/list-url`）が組みます。",
          "キーの綴りを写すと、一覧が契約に合わせて変えたときにこちらだけが古いままになります。",
        ].join(""),
      },
    },
  },
  args: { categories: CATEGORIES },
} satisfies Meta<typeof CategoryLinks>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 分類が並んだ状態。 */
export const Default: Story = {};

/** 分類名が長い場合。数も長さもバックエンド次第なので折り返す。 */
export const LongNames: Story = {
  args: {
    categories: [
      ...CATEGORIES,
      { id: "c7", code: 70, name: "ノイズキャンセリング対応ワイヤレスオーディオ機器" },
      { id: "c8", code: 80, name: "スマートホーム連携デバイス（ハブ・センサー類）" },
    ],
  },
};
