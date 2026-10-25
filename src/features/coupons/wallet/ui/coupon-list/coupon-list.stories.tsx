import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { FIXTURE_NOW, HELD_COUPONS, UNUSED_COUPON } from "../../../coupons.fixture";
import { CouponList } from "./coupon-list";

const meta = {
  title: "Features/Coupons/Wallet/CouponList",
  component: CouponList,
  parameters: {
    docs: {
      description: {
        component: [
          "保有クーポンの一覧です。状態は 3 つの時刻を `now` に照らして決めます。読むための一覧で、",
          "行は押せません。",
        ].join(""),
      },
    },
  },
  args: { coupons: HELD_COUPONS, now: FIXTURE_NOW },
} satisfies Meta<typeof CouponList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 4 状態が 1 枚ずつ並ぶ。 */
export const AllStates: Story = {};

/** 1 枚も持っていない。 */
export const Empty: Story = {
  args: { coupons: [] },
};

/** 額面と条件がいちばん長くなる組み合わせ。折り返しても状態の印が崩れない。 */
export const LongValues: Story = {
  args: {
    coupons: [
      {
        ...UNUSED_COUPON,
        discount: { kind: "rate", value: "0.125", maxAmount: 123456789 },
        minPurchaseAmount: 987654321,
      },
    ],
  },
  globals: { viewport: { value: "mobile2", isRotated: false } },
};

/** スマホ幅。 */
export const Mobile: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
};
