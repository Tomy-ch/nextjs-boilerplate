import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { BUTTON_SIZE } from "@/components/design-system/action/button/button.definition";

import { CART, CART_WITHOUT_PURCHASABLE } from "../../cart.fixture";
import { CartCheckoutLink } from "./checkout-link";

const meta = {
  title: "Features/Cart/CheckoutLink",
  component: CartCheckoutLink,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "購入手続きへ進む操作です。**買える明細が 1 つも無ければ押せません。** ",
          "判定は 1 か所（`canCheckout`）が持ち、この部品は見せ方だけを持ちます。",
          "押せない状態を link のままにしないのは、押しても移動しない link が支援技術から見て",
          "壊れた導線になるためです。",
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
} satisfies Meta<typeof CartCheckoutLink>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 買える明細がある状態。 */
export const Enabled: Story = {
  args: { cart: CART },
};

/** 買える明細が 1 つも無い状態。 */
export const Disabled: Story = {
  args: { cart: CART_WITHOUT_PURCHASABLE },
};

/** 脇の領域に置く小さい姿。 */
export const Small: Story = {
  args: { cart: CART, size: BUTTON_SIZE.SMALL },
};
