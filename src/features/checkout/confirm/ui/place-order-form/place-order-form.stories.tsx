import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";

import { PlaceOrderForm } from "./place-order-form";

/** 画面が組み立てた鍵の代わり。カタログでは送信しないため、値そのものに意味はない。 */
const IDEMPOTENCY_KEY = "0195f0c2-0000-7000-a000-000000000001";

const meta = {
  title: "Features/Checkout/PlaceOrderForm",
  component: PlaceOrderForm,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "購入を確定する操作です。**鍵は画面が組んだ時点の値を送ります** —— 押すたびに作り直すと、",
          "二重に押したぶんだけ購入が増えます。金額が変わっているときは、押した先で進んでよいかを",
          "確かめます。**カタログでは購入は実行されません。**",
        ].join(""),
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PlaceOrderForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 確定できる状態。押すとそのまま送る。 */
export const Default: Story = {
  args: { idempotencyKey: IDEMPOTENCY_KEY, orderable: true, priceChangedNames: [] },
};

/** 確定できる明細が無い状態。押せない。 */
export const Disabled: Story = {
  args: { idempotencyKey: IDEMPOTENCY_KEY, orderable: false, priceChangedNames: [] },
};

/** 金額が変わっている状態。押すと、進んでよいかを確かめる。 */
export const PriceChanged: Story = {
  args: {
    idempotencyKey: IDEMPOTENCY_KEY,
    orderable: true,
    priceChangedNames: ["ノイズキャンセリングヘッドホン"],
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "注文を確定する" }));
  },
};
