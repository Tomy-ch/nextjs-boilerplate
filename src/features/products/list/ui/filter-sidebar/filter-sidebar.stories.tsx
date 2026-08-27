import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { FILTER_KEY, type ProductListSelection } from "../../../facade/list-url/list-url";
import { ProductFilterDraftProvider } from "../../filter-draft";
import type { FilterOption } from "../../query";
import { ProductFilterSidebar, type ProductFilterSidebarProps } from "./filter-sidebar";

/** 契約が宣言している上限。実画面はこの値を `adapters` から受け取る。 */
const LIMIT = 32;

const CATEGORIES: readonly FilterOption[] = [
  { value: "10", label: "オーディオ" },
  { value: "20", label: "ウェアラブル" },
  { value: "30", label: "アクセサリ" },
];

/** 上限に届く数の分類。上限に達した見え方を確かめるために要る。 */
const MANY_CATEGORIES: readonly FilterOption[] = Array.from({ length: LIMIT + 4 }, (_, index) => ({
  value: String((index + 1) * 10),
  label: `分類 ${index + 1}`,
}));

/**
 * 画面と同じ器に置く。
 *
 * @remarks
 * 下書きは画面で 1 つのものを読み、供給の外では失敗させてあります。効いている条件は脇の絞り込み
 * 自身の props ではないため、器の引数としてここで受け取ります。
 */
function SidebarInPage({
  selection,
  ...props
}: ProductFilterSidebarProps & { selection: ProductListSelection }) {
  return (
    <div className="w-72">
      <ProductFilterDraftProvider selection={selection}>
        <ProductFilterSidebar {...props} />
      </ProductFilterDraftProvider>
    </div>
  );
}

const meta = {
  title: "Features/Products/List/FilterSidebar",
  component: SidebarInPage,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "脇に常設する絞り込みです。一覧が隣に見えている幅にだけ出るため、**選んだ時点で反映し、",
          "確定の操作を置きません**。**canvas では遷移が起きない**ので、選んでも一覧は動きません。",
        ].join(""),
      },
    },
  },
  args: { categories: CATEGORIES, categoryLimit: LIMIT, selection: {} },
} satisfies Meta<typeof SidebarInPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 何も選んでいない状態。 */
export const Default: Story = {};

/** 条件が効いている状態。効いている条件が入力欄に映る。 */
export const Filtered: Story = {
  args: {
    selection: {
      [FILTER_KEY.CATEGORY]: ["10", "30"],
      [FILTER_KEY.MIN_PRICE]: "25",
      [FILTER_KEY.MAX_PRICE]: "250",
      [FILTER_KEY.MIN_QUANTITY]: "1",
    },
  },
};

/**
 * 分類の上限に達した状態。まだ選んでいない分類が選べなくなり、いくつまで選べるかが末尾に出る。
 *
 * 上限に届かないあいだは何も出ない。到達するのは分類が上限を超える数だけある場合に限られる。
 */
export const ReachedCategoryLimit: Story = {
  args: {
    categories: MANY_CATEGORIES,
    selection: {
      [FILTER_KEY.CATEGORY]: MANY_CATEGORIES.slice(0, LIMIT).map((option) => option.value),
    },
  },
};

/** 分類名が長い場合。折り返しても入力欄の位置が崩れないことを見る。 */
export const LongLabel: Story = {
  args: {
    categories: [{ value: "10", label: "オーディオ関連機器およびアクセサリ全般".repeat(3) }],
  },
};
