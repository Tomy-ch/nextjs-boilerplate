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
          "**買えない事情だけ配色を変えます。** 値の変動は買えなくなる事情ではないため、",
          "同じ強さで出すとどちらに対処すべきかが読み取れません。",
          "事情が 1 つでもあれば小計の合算から外れるため、その旨を添えます。",
        ].join(""),
      },
    },
  },
  args: { availableQuantity: null },
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
