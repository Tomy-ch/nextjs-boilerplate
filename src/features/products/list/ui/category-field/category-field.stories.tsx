import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import type { FilterOption } from "../../query";
import { ProductCategoryField } from "./category-field";

const CATEGORIES: readonly FilterOption[] = [
  { value: "10", label: "オーディオ" },
  { value: "20", label: "ウェアラブル" },
  { value: "30", label: "アクセサリ" },
];

/** 契約が宣言している上限。実画面はこの値を `adapters` から受け取る。 */
const LIMIT = 32;

/** 上限に届く数の分類。上限に達した見え方を確かめるために要る。 */
const MANY_CATEGORIES: readonly FilterOption[] = Array.from({ length: LIMIT + 4 }, (_, index) => ({
  value: String((index + 1) * 10),
  label: `分類 ${index + 1}`,
}));

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
  args: { onChange: fn(), options: CATEGORIES, selected: [], limit: LIMIT },
  decorators: [(Story) => <div className="w-64">{Story()}</div>],
} satisfies Meta<typeof ProductCategoryField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 何も選んでいない状態。 */
export const Default: Story = {};

/** 複数選んだ状態。 */
export const Selected: Story = {
  args: { selected: ["10", "30"] },
};

/** 上限の宣言が無い分類名。折り返しても checkbox の位置が崩れないことを見る。 */
export const LongLabel: Story = {
  args: { options: [{ value: "10", label: "オーディオ関連機器およびアクセサリ全般".repeat(3) }] },
};

/**
 * 上限に達した状態。まだ選んでいない分類が選べなくなり、いくつまで選べるかが末尾に出る。
 *
 * 上限に届かないあいだは残り数も告知も出さない。到達するのは分類が上限を超える数だけある場合に
 * 限られ、常に出すと届かない制約のために全員の視界を占めることになる。
 */
export const ReachedLimit: Story = {
  args: {
    options: MANY_CATEGORIES,
    selected: MANY_CATEGORIES.slice(0, LIMIT).map((option) => option.value),
  },
};

/** 上限が小さい場合。契約が変われば上限も動くため、数を書き写さない形になっている。 */
export const SmallLimit: Story = {
  args: { limit: 2, selected: ["10", "20"] },
};
