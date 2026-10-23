import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { toPageLinks } from "../../page-window";
import { OffsetPagination } from "./offset-pagination";

/**
 * story の行き先。ページ番号だけを URL に持つ。
 *
 * @param page - 行き先のページ番号
 * @returns 行き先の URL
 */
const hrefOf = (page: number) => `?page=${page}`;

const meta = {
  title: "Features/Admin/OffsetPagination",
  component: OffsetPagination,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "管理画面の一覧のページ送りです。**任意のページへ跳べます** —— 契約が全件数を返す offset 方式で、次と前しか指せない商品・購入の一覧とは部品から違います。",
          "行き先と名前は一覧が渡します。端でも前後を消さず、押せない control として残します。",
        ].join(""),
      },
    },
  },
  args: {
    links: toPageLinks(1, 4, hrefOf),
    label: "一覧のページ送り",
  },
} satisfies Meta<typeof OffsetPagination>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 先頭ページ。戻る先が無いので「前へ」は押せない。 */
export const FirstPage: Story = {};

/** 途中のページ。前後のどちらへも進め、離れた範囲は省略記号で畳まれる。 */
export const MiddlePage: Story = {
  args: { links: toPageLinks(5, 12, hrefOf) },
};

/** 末尾のページ。次が無いので「次へ」は押せない。 */
export const LastPage: Story = {
  args: { links: toPageLinks(4, 4, hrefOf) },
};

/** ページが 1 枚しかない状態。前後のどちらも押せないまま、位置は保たれる。 */
export const SinglePage: Story = {
  args: { links: toPageLinks(1, 1, hrefOf) },
};
