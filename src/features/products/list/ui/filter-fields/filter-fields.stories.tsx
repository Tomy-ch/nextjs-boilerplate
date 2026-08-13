import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { FILTER_KEY } from "../../../facade/list-url/list-url";
import { type FilterGroup, ProductFilterFields } from "./filter-fields";

const GROUPS: readonly FilterGroup[] = [
  {
    key: FILTER_KEY.CATEGORY,
    legend: "カテゴリ",
    options: [
      { value: "", label: "すべて" },
      { value: "c1", label: "オーディオ" },
      { value: "c2", label: "ウェアラブル" },
      { value: "c3", label: "アクセサリ" },
    ],
  },
  {
    key: FILTER_KEY.STATUS,
    legend: "状態",
    options: [
      { value: "", label: "すべて" },
      { value: "s1", label: "公開" },
      { value: "s2", label: "在庫切れ" },
    ],
  },
];

const meta = {
  title: "Features/Products/List/FilterFields",
  component: ProductFilterFields,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "選択を持たない入力欄です。**canvas では選んでも見た目が変わりません。**",
          "同じ欄を、選ぶたびに反映する脇の領域と、まとめて確定する overlay の両方から使います。",
          "単一選択なのは、契約が受け付けるカテゴリと状態がそれぞれ 1 つだからです。",
        ].join(""),
      },
    },
  },
  args: { groups: GROUPS, onSelect: fn(), selection: {} },
} satisfies Meta<typeof ProductFilterFields>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 条件が無い状態。どちらの群も「すべて」が選ばれている。 */
export const Default: Story = {};

/** 条件が効いている状態。 */
export const Selected: Story = {
  args: { selection: { [FILTER_KEY.CATEGORY]: "c1", [FILTER_KEY.STATUS]: "s2" } },
};

/** 上限の宣言が無い分類名。選択肢が折り返しても操作の位置が崩れないことを見る。 */
export const LongLabel: Story = {
  args: {
    groups: [
      {
        key: FILTER_KEY.CATEGORY,
        legend: "カテゴリ",
        options: [
          { value: "", label: "すべて" },
          { value: "c1", label: "オーディオ関連機器およびアクセサリ全般".repeat(3) },
        ],
      },
    ],
  },
};
