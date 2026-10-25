import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { PlaceOrderStateProvider } from "../place-order-state/place-order-state";
import { PlaceOrderForm } from "./place-order-form";

/** 画面が組み立てた鍵の代わり。カタログでは確定を実行しないため、値そのものに意味はない。 */

const meta = {
  title: "Features/Checkout/Confirm/PlaceOrderForm",
  component: PlaceOrderForm,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "購入をそのまま確定する操作です。**鍵は押すたびには作り直しません** —— 押すたびに",
          "作り直すと、二重に押したぶんだけ購入が増えます。金額が変わっているときは別の姿",
          "（`PriceChangeConfirm`）を使います。**カタログでは購入は実行されません。**",
        ].join(""),
      },
    },
  },
  decorators: [
    // 送信の状態は画面に 1 つだけ置く `PlaceOrderStateProvider` が持ち、その外では読めない。
    (Story) => (
      <PlaceOrderStateProvider coupons={[]}>
        <div className="w-72">
          <Story />
        </div>
      </PlaceOrderStateProvider>
    ),
  ],
} satisfies Meta<typeof PlaceOrderForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 確定できる状態。押すとそのまま送る。 */
export const Default: Story = {
  args: { orderable: true },
};

/** 確定できる明細が無い状態。押せない。 */
export const Disabled: Story = {
  args: { orderable: false },
};
