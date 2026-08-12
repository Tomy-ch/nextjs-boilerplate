import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { FILTER_KEY } from "../../query";
import { ProductSortSelect } from "./sort-select";

const meta = {
  title: "Features/Products/List/SortSelect",
  component: ProductSortSelect,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "並び替えを URL へ書き戻す client island です。**canvas では遷移しません。**",
          "幅によらず選んだ時点で反映します。単一選択は選ぶことが確定と同じためです。",
        ].join(""),
      },
    },
  },
  args: {
    options: [
      { value: "", label: "新着順" },
      { value: "publishedAt", label: "古い順" },
    ],
    selection: {},
  },
} satisfies Meta<typeof ProductSortSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定の並び。URL には載っていない。 */
export const Default: Story = {};

/** 既定以外を選んだ状態。 */
export const Oldest: Story = {
  args: { selection: { [FILTER_KEY.SORT]: "publishedAt" } },
};
