import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { CartLineIssues } from "./line-issues";

const meta = {
  title: "Features/Cart/LineIssues",
  component: CartLineIssues,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "明細に立った事情を行の中に並べます。判定はバックエンドが持ち、ここは言い方だけを決めます。",
          "**強さは 3 段階です。** 買えない事情は取り消しの配色と丸の絵柄、値が変わった事情は",
          "警告の配色と三角の絵柄、画面が足す一文は補足として弱く出します。カートと購入確認の",
          "両方が使うため、画面ごとに違うのは最後の一文（`note`）だけです。",
        ].join(""),
      },
    },
  },
  args: { availableQuantity: null, note: "小計には含めていません。" },
} satisfies Meta<typeof CartLineIssues>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 在庫が数量に足りない。今買える数を差し込む。 */
export const InsufficientStock: Story = {
  args: { availableQuantity: 2, issues: ["insufficientStock"] },
};

/** 在庫が無い。 */
export const OutOfStock: Story = {
  args: { issues: ["outOfStock"] },
};

/** 商品を引けない。取り除く以外にできることが無い。 */
export const NotFound: Story = {
  args: { issues: ["notFound"] },
};

/** 値が上がった。買えるが、合算からは外れる。 */
export const PriceIncreased: Story = {
  args: { issues: ["priceIncreased"] },
};

/** 複数が同時に立つ場合。畳まずに並べる。 */
export const Multiple: Story = {
  args: { availableQuantity: 1, issues: ["insufficientStock", "priceIncreased"] },
};

/** 事情が無い場合。何も出さない。 */
export const None: Story = {
  args: { issues: [] },
};
