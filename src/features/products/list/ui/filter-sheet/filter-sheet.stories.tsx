import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";

import { FILTER_KEY } from "../../../facade/list-url/list-url";
import { ProductFilterDraftProvider } from "../../filter-draft";
import type { FilterOption } from "../../query";
import { ProductFilterSheet } from "./filter-sheet";

const CATEGORIES: readonly FilterOption[] = [
  { value: "c1", label: "オーディオ" },
  { value: "c2", label: "ウェアラブル" },
  { value: "c3", label: "アクセサリ" },
];

const meta = {
  title: "Features/Products/List/FilterSheet",
  component: ProductFilterSheet,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: [
          "脇に領域を持てない幅の絞り込みです。**canvas では遷移せず、該当件数も出ません**",
          "（数えるには取得の口が要ります）。確定の仕方は脇に常設する側と同じで、違うのは",
          "条件を組んでいる間に一覧が見えないことだけです。",
        ].join(""),
      },
    },
  },
  globals: { viewport: { value: "mobile2", isRotated: false } },
  // 下書きの供給は画面（`view.tsx`）が持つ。この部品は読む側なので、canvas でも同じ供給を置く。
  decorators: [
    (Story, context) => (
      <ProductFilterDraftProvider selection={context.args.selection}>
        {Story()}
      </ProductFilterDraftProvider>
    ),
  ],
  args: { categories: CATEGORIES, selection: {} },
} satisfies Meta<typeof ProductFilterSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 閉じている状態。下端に開く操作だけが出る。 */
export const Closed: Story = {};

/** 条件が効いている状態。効いている数が開く操作に付く。 */
export const WithActiveCount: Story = {
  args: {
    selection: {
      [FILTER_KEY.CATEGORY]: ["c1", "c3"],
      [FILTER_KEY.MIN_PRICE]: "25",
      [FILTER_KEY.MIN_QUANTITY]: "1",
    },
  },
};

/** 開いた状態。中で条件を組み、下端の操作で確定する。 */
export const Open: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: /絞り込み/ }));
  },
};
