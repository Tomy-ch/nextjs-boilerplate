import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import type { FilterOption } from "../../query";
import { ProductCategoryField } from "./category-field";

const CATEGORIES: readonly FilterOption[] = [
  { value: "c1", label: "オーディオ" },
  { value: "c2", label: "ウェアラブル" },
  { value: "c3", label: "アクセサリ" },
];

const meta = {
  title: "Features/Products/List/CategoryField",
  component: ProductCategoryField,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "分類の絞り込みです。**複数選べます。** 1 つも選んでいない状態がそのまま「すべて」なので、",
          "「すべて」の選択肢は置きません。**canvas では選んでも見た目が変わりません**",
          "（選択を持つのは呼び出し元です）。",
        ].join(""),
      },
    },
  },
  args: { onChange: fn(), options: CATEGORIES, selected: [] },
  decorators: [(Story) => <div className="w-64">{Story()}</div>],
} satisfies Meta<typeof ProductCategoryField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 何も選んでいない状態。 */
export const Default: Story = {};

/** 複数選んだ状態。 */
export const Selected: Story = {
  args: { selected: ["c1", "c3"] },
};

/** 上限の宣言が無い分類名。折り返しても checkbox の位置が崩れないことを見る。 */
export const LongLabel: Story = {
  args: { options: [{ value: "c1", label: "オーディオ関連機器およびアクセサリ全般".repeat(3) }] },
};
