import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";

import { FILTER_KEY } from "../../../facade/list-url/list-url";
import { ProductFilterDraftProvider } from "../../filter-draft";
import type { FilterOption } from "../../query";
import { ProductFilterSheet, type ProductFilterSheetProps } from "./filter-sheet";

const CATEGORIES: readonly FilterOption[] = [
  { value: "10", label: "オーディオ" },
  { value: "20", label: "ウェアラブル" },
  { value: "30", label: "アクセサリ" },
];

/**
 * 画面と同じ器に置く。
 *
 * @remarks
 * 下書きは画面で 1 つのものを読み、供給の外では失敗させてあります。器を decorator ではなく
 * component にしてあるのは、効いている条件を story の引数として型のまま扱うためです。
 */
function SheetInPage(props: ProductFilterSheetProps) {
  return (
    <ProductFilterDraftProvider selection={props.selection}>
      <ProductFilterSheet {...props} />
    </ProductFilterDraftProvider>
  );
}

const meta = {
  title: "Features/Products/List/FilterSheet",
  component: SheetInPage,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: [
          "脇に領域を持てない幅の絞り込みです。**canvas では遷移せず、該当件数も出ません**",
          "（数えるには取得の口が要ります）。一覧が overlay の裏に隠れるため、脇に常設する側と違って",
          "選んだ時点では反映せず、下端の操作で確定します。",
        ].join(""),
      },
    },
  },
  globals: { viewport: { value: "mobile2", isRotated: false } },
  args: { categoryLimit: 32, categories: CATEGORIES, selection: {} },
} satisfies Meta<typeof SheetInPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 閉じている状態。下端に開く操作だけが出る。 */
export const Closed: Story = {};

/** 条件が効いている状態。効いている数が開く操作に付く。 */
export const WithActiveCount: Story = {
  args: {
    selection: {
      [FILTER_KEY.CATEGORY]: ["10", "30"],
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
