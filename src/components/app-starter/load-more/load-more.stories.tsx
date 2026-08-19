import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { LoadMore } from "./load-more";

const meta = {
  title: "Navigation/LoadMore",
  component: LoadMore,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "読み進めて積み増す一覧の末尾に置く、続きの読み込みの状態です。",
          "**読み直す操作は失敗したときだけ出します。**",
          "読み進めている間は末尾に近づくだけで次が始まるためで、",
          "同じことをする入口を並べても選ぶ手数が増えるだけです。",
        ].join(""),
      },
    },
  },
} satisfies Meta<typeof LoadMore>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 続きがある状態。末尾に近づけば自動で読むため、操作は出さない。 */
export const HasNext: Story = {
  args: { state: { status: "idle" } },
};

/** 続きを取得している最中。 */
export const Loading: Story = {
  args: { state: { status: "loading" } },
};

/** 続きの取得に失敗した状態。ここでだけ読み直す操作を出す。 */
export const Failed: Story = {
  args: { state: { status: "failed", onRetry: () => {} } },
};

/** 最後まで読み終えた状態。空の枠を残すと、まだ続きがあるように読める。 */
export const ReachedEnd: Story = {
  args: { state: { status: "exhausted" } },
};

/** 文言を差し替えた場合。何の一覧かは呼び出し元が知っている。 */
export const CustomLabels: Story = {
  args: {
    state: { status: "failed", onRetry: () => {} },
    failureMessage: "続きの記録を読み込めませんでした。",
    retryLabel: "読み直す",
  },
};
