import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { CART_COUPONS } from "../../../checkout.fixture";
import { PlaceOrderForm } from "../place-order-form/place-order-form";
import { PlaceOrderStateProvider } from "../place-order-state/place-order-state";
import { CouponField } from "./coupon-field";

/** 画面が組み立てた鍵の代わり。カタログでは確定を実行しないため、値そのものに意味はない。 */

const meta = {
  title: "Features/Checkout/Confirm/CouponField",
  component: CouponField,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "確定に載せるクーポンを 1 枚選ぶ欄です。**値引き額は受け取った値をそのまま出し**、小計からは",
          "差し引きません（集計には見込みとして別の行に出ます）。「使わない」を先頭に置き、最初はどれも",
          "選んでいません。選択は確定の送信状態と同じ器が持ち、脇・帯・金額の確かめのどこから確定しても",
          "同じ選択が載ります。",
        ].join(""),
      },
    },
  },
  args: { coupons: CART_COUPONS },
  decorators: [
    // 選択は送信状態の器が持つ。確定の操作を並べ、選んだ値が送信に載ることも確かめられるようにする。
    (Story, { args }) => (
      <PlaceOrderStateProvider coupons={args.coupons ?? null}>
        <div className="flex max-w-md flex-col gap-4">
          <Story />
          <PlaceOrderForm orderable />
        </div>
      </PlaceOrderStateProvider>
    ),
  ],
} satisfies Meta<typeof CouponField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 使えるクーポンが並んだ状態。まだどれも選んでいない。 */
export const Default: Story = {};

/** 使えるクーポンを読めなかった状態。使わずに注文できることだけを告げる。 */
export const Unavailable: Story = {
  args: { coupons: null },
};
