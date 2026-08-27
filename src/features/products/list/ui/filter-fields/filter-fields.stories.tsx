import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { FILTER_KEY } from "../../../facade/list-url/list-url";
import type { FilterOption } from "../../query";
import { ProductFilterFields } from "./filter-fields";

const CATEGORIES: readonly FilterOption[] = [
  { value: "c1", label: "オーディオ" },
  { value: "c2", label: "ウェアラブル" },
  { value: "c3", label: "アクセサリ" },
];

const meta = {
  title: "Features/Products/List/FilterFields",
  component: ProductFilterFields,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "絞り込みの入力欄です。**canvas では選んでも見た目が変わりません**（下書きを持つのは",
          "呼び出し元です）。価格・カテゴリ・在庫状況を上から並べ、どこで確定するかは呼び出し元が",
          "決めます。入力欄と URL のキーの対応を知っているのはこの部品だけです。",
        ].join(""),
      },
    },
  },
  args: { categoryLimit: 32, categories: CATEGORIES, draft: {}, onChange: fn() },
} satisfies Meta<typeof ProductFilterFields>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 条件が無い状態。 */
export const Default: Story = {};

/** 条件が効いている状態。分類は複数選べる。 */
export const Selected: Story = {
  args: {
    draft: {
      [FILTER_KEY.MIN_PRICE]: "25",
      [FILTER_KEY.MAX_PRICE]: "250",
      [FILTER_KEY.CATEGORY]: ["c1", "c3"],
      [FILTER_KEY.MIN_QUANTITY]: "1",
    },
  },
};

/** 上限の宣言が無い分類名。選択肢が折り返しても操作の位置が崩れないことを見る。 */
export const LongLabel: Story = {
  args: {
    categories: [{ value: "c1", label: "オーディオ関連機器およびアクセサリ全般".repeat(3) }],
  },
};

/** 分類が多い状態。縦に伸びても確定の操作へ届くことは、置く側の追従が受け持つ。 */
export const ManyCategories: Story = {
  args: {
    categories: Array.from({ length: 12 }, (_, index) => ({
      value: `c${index}`,
      label: `分類 ${index + 1}`,
    })),
  },
};
