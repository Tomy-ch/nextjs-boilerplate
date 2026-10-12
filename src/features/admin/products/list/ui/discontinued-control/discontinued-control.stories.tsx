import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { DISCONTINUED_FILTER } from "../../query";
import { AdminProductDiscontinuedControl } from "./discontinued-control";

const meta = {
  title: "Features/Admin/Products/List/DiscontinuedControl",
  component: AdminProductDiscontinuedControl,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "廃番で絞り込む選択欄です。**2 つは排他で、どちらも選ばれていない状態が「絞り込まない」**です。",
          "選んだ値をどう扱うかは持ちません（選んだ時点で反映する場所と、overlay の中の 2 か所に出るため）。",
        ].join(""),
      },
    },
  },
  args: { value: null, onSelect: fn() },
} satisfies Meta<typeof AdminProductDiscontinuedControl>;

export default meta;
type Story = StoryObj<typeof meta>;

/** どちらも選ばれていない状態。 */
export const Default: Story = {};

/** 廃番のみが選ばれた状態。 */
export const OnlyDiscontinued: Story = {
  args: { value: DISCONTINUED_FILTER.ONLY },
};

/** 廃番を除くが選ばれた状態。 */
export const ExcludingDiscontinued: Story = {
  args: { value: DISCONTINUED_FILTER.EXCLUDED },
};
