import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { DISCONTINUED_AT } from "../../discontinue.fixture";
import { DiscontinuedState } from "./discontinued-state";

const meta = {
  title: "Features/Admin/Products/Discontinue/DiscontinuedState",
  component: DiscontinuedState,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "既に廃番の商品であることと、その日時です。**実行の入口も見積もりも出しません**（もう一度実行しても何も起きないため）。",
      },
    },
  },
  args: { discontinuedAt: DISCONTINUED_AT },
} satisfies Meta<typeof DiscontinuedState>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 廃番済みの商品。 */
export const Default: Story = {};
