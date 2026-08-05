import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { CursorPagination } from "./cursor-pagination";

const meta = {
  title: "Navigation/CursorPagination",
  component: CursorPagination,
  parameters: { layout: "centered" },
  args: { nextHref: "?after=abc", previousHref: "?before=xyz" },
} satisfies Meta<typeof CursorPagination>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 前後どちらへも移動できる状態。 */
export const Default: Story = {};

/** 先頭ページ。前へは link ではなく操作できない control になる。 */
export const AtStart: Story = { args: { previousHref: undefined } };

/** 末尾ページ。次へが操作できない control になる。 */
export const AtEnd: Story = { args: { nextHref: undefined } };

/** 結果が 1 ページに収まる場合。位置を保つため要素は残す。 */
export const SinglePage: Story = { args: { nextHref: undefined, previousHref: undefined } };

/** 文言を差し替える場合。アクセシブルな名前も一緒に変わる。 */
export const CustomLabels: Story = {
  args: { nextLabel: "続きを読む", previousLabel: "前の結果" },
};

/** 同じ画面に複数並ぶ場合は `aria-label` で区別する。 */
export const Labelled: Story = { args: { "aria-label": "検索結果のページ送り" } };
