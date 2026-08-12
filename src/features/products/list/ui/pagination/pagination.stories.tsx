import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ProductPagination } from "./pagination";

const meta = {
  title: "Features/Products/List/Pagination",
  component: ProductPagination,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "cursor 方式の送りです。総件数も任意ページへの飛び先もカーソルは持たないため、",
          "番号付きのページ送りは作れません。次が無ければ何も描画しません。",
        ].join(""),
      },
    },
  },
  args: { searchParams: {} },
} satisfies Meta<typeof ProductPagination>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 次ページがある状態。 */
export const HasNext: Story = {
  args: { nextCursor: "0195f0c2-0000-7000-8000-000000000010" },
};

/** 現在の条件を引き継ぐ場合。送り先の URL に検索条件が残る。 */
export const KeepsQuery: Story = {
  args: {
    nextCursor: "0195f0c2-0000-7000-8000-000000000010",
    searchParams: { keyword: "イヤホン" },
  },
};

/** 次が無い状態。要素ごと描画しない。 */
export const NoNext: Story = {
  args: { nextCursor: null },
};
