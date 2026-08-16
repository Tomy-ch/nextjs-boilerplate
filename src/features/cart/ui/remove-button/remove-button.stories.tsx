import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { EARPHONE_LINE } from "../../cart.fixture";
import { CartRemoveButton } from "./remove-button";

const meta = {
  title: "Features/Cart/RemoveButton",
  component: CartRemoveButton,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "明細 1 行を取り除く操作です。**確認を挟みません。** 同じ画面からすぐ入れ直せるためで、",
          "行数ぶんまとめて消える「カートを空にする」とはここが違います。",
        ].join(""),
      },
    },
  },
  args: {
    index: 0,
    label: EARPHONE_LINE.name ?? "",
    productId: EARPHONE_LINE.productId,
    quantity: EARPHONE_LINE.quantity,
  },
} satisfies Meta<typeof CartRemoveButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。 */
export const Default: Story = {};
