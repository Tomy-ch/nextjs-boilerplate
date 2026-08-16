import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { FILTER_KEY } from "../../../facade/list-url/list-url";
import type { FilterOption } from "../../query";
import { ProductFilterPanel } from "./filter-panel";

const CATEGORIES: readonly FilterOption[] = [
  { value: "c1", label: "オーディオ" },
  { value: "c2", label: "ウェアラブル" },
  { value: "c3", label: "アクセサリ" },
];

const meta = {
  title: "Features/Products/List/FilterPanel",
  component: ProductFilterPanel,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "絞り込みの見た目です。入力欄と確定の操作を縦に積みます。取得も下書きも持たないため、",
          "**canvas では選んでも件数は変わりません**。脇に常設する側がこれを取得へつなぎます。",
        ].join(""),
      },
    },
  },
  args: { categories: CATEGORIES, count: 128, draft: {}, onApply: fn(), onChange: fn() },
  decorators: [(Story) => <div className="w-64">{Story()}</div>],
} satisfies Meta<typeof ProductFilterPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 条件が無い状態。 */
export const Default: Story = {};

/** 条件が効いている状態。 */
export const Selected: Story = {
  args: {
    count: 12,
    draft: {
      [FILTER_KEY.MIN_PRICE]: "25",
      [FILTER_KEY.MAX_PRICE]: "250",
      [FILTER_KEY.CATEGORY]: ["c1", "c3"],
      [FILTER_KEY.MIN_QUANTITY]: "1",
    },
  },
};

/** 件数を数え直している最中。1 つ前の件数を薄くして残す。 */
export const Counting: Story = {
  args: { counting: true },
};
