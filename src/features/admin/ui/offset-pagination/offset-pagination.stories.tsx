import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { OffsetPagination } from "./offset-pagination";

const meta = {
  title: "Features/Admin/OffsetPagination",
  component: OffsetPagination,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "管理画面の一覧のページ送りです。**任意のページへ跳べます** —— 契約が全件数を返す offset 方式で、次と前しか指せない商品・購入の一覧とは部品から違います。",
          "行き先の組み方と名前は一覧が渡します。端でも前後を消さず、押せない control として残します。",
        ].join(""),
      },
    },
  },
  args: {
    page: 1,
    pageCount: 4,
    hrefOf: (page: number) => `?page=${page}`,
    label: "一覧のページ送り",
  },
} satisfies Meta<typeof OffsetPagination>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 先頭ページ。戻る先が無いので「前へ」は押せない。 */
export const FirstPage: Story = {};

/** 途中のページ。前後のどちらへも進め、離れた範囲は省略記号で畳まれる。 */
export const MiddlePage: Story = {
  args: { page: 5, pageCount: 12 },
};

/** 末尾のページ。次が無いので「次へ」は押せない。 */
export const LastPage: Story = {
  args: { page: 4, pageCount: 4 },
};

/** ページが 1 枚しかない状態。前後のどちらも押せないまま、位置は保たれる。 */
export const SinglePage: Story = {
  args: { page: 1, pageCount: 1 },
};
