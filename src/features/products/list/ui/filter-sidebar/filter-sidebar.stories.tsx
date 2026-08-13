import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { FILTER_KEY } from "../../query";
import type { FilterGroup } from "../filter-fields/filter-fields";
import { ProductFilterSidebar } from "./filter-sidebar";

const GROUPS: readonly FilterGroup[] = [
  {
    key: FILTER_KEY.CATEGORY,
    legend: "カテゴリ",
    options: [
      { value: "", label: "すべて" },
      { value: "c1", label: "オーディオ" },
      { value: "c2", label: "ウェアラブル" },
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
  title: "Features/Products/List/FilterSidebar",
  component: ProductFilterSidebar,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "脇に常設する絞り込みです。**canvas では遷移しないので選んでも一覧は変わりません。**",
          "確定の操作を持たないのは、結果が同じ画面に見えている配置では選んだ内容がそのまま",
          "結果に出るのが分かりやすく、確定を挟むと「選んだのに変わらない」状態が生まれるためです。",
          "出す幅の判断はこの部品ではなく置く側が持ちます。",
        ].join(""),
      },
    },
  },
  args: { groups: GROUPS, selection: {} },
  decorators: [(Story) => <div className="w-64">{Story()}</div>],
} satisfies Meta<typeof ProductFilterSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 条件が無い状態。 */
export const Default: Story = {};

/** 条件が効いている状態。 */
export const Selected: Story = {
  args: { selection: { [FILTER_KEY.CATEGORY]: "c1", [FILTER_KEY.STATUS]: "s2" } },
};
