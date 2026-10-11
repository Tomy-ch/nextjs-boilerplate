import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { PurchaseAppliedCoupon } from "./applied-coupon";

const meta = {
  title: "Features/Purchases/Detail/AppliedCoupon",
  component: PurchaseAppliedCoupon,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "購入に適用したクーポンの中身です。値引きの行の直下に添え、額面・上限・範囲を 1 行に並べます。",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="w-80 rounded-lg border p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PurchaseAppliedCoupon>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 上限のある定率。上限を括弧で添える。 */
export const CappedRate: Story = {
  args: {
    coupon: { discount: { kind: "rate", value: "0.10", maxAmount: 1_000 }, scopeKind: "all" },
  },
};

/** 上限の無い定率。範囲を分類で絞る。 */
export const UncappedRate: Story = {
  args: {
    coupon: { discount: { kind: "rate", value: "0.15", maxAmount: null }, scopeKind: "category" },
  },
};

/** 定額。上限を持たない。 */
export const Flat: Story = {
  args: {
    coupon: { discount: { kind: "flat", value: "5.00" }, scopeKind: "product" },
  },
};
