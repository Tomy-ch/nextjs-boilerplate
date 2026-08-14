import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";

import { FILTER_KEY } from "../../../facade/list-url/list-url";
import type { FilterGroup } from "../filter-fields/filter-fields";
import { ProductFilterSheet } from "./filter-sheet";

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
  title: "Features/Products/List/FilterSheet",
  component: ProductFilterSheet,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: [
          "脇に領域を持てない幅の絞り込みです。**canvas では遷移しません。**",
          "選ぶたびに反映しないのは、overlay が一覧を覆っていて結果が見えないためです。",
          "開く操作を下端に固定するのは、読み進めた先でも絞り込みへ戻れるようにするためです。",
        ].join(""),
      },
    },
  },
  globals: { viewport: { value: "mobile2", isRotated: false } },
  args: { groups: GROUPS, selection: {} },
} satisfies Meta<typeof ProductFilterSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 閉じている状態。下端に開く操作だけが出る。 */
export const Closed: Story = {};

/** 条件が効いている状態。効いている数が開く操作に付く。 */
export const WithActiveCount: Story = {
  args: { selection: { [FILTER_KEY.CATEGORY]: "c1", [FILTER_KEY.STATUS]: "s2" } },
};

/** 開いた状態。中で条件を組み、下端の操作で確定する。 */
export const Open: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: /絞り込み/ }));
  },
};
