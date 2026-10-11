import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ADMIN_PRODUCT_LIST_PATH } from "../../../../paths";
import { NO_CONDITIONS } from "../../list.fixture";
import { DISCONTINUED_FILTER } from "../../query";
import { AdminProductDiscontinuedSelect } from "./discontinued-select";

const meta = {
  title: "Features/Admin/Products/List/DiscontinuedSelect",
  component: AdminProductDiscontinuedSelect,
  parameters: {
    layout: "padded",
    nextjs: { navigation: { pathname: ADMIN_PRODUCT_LIST_PATH } },
    docs: {
      description: {
        component: [
          "選んだ時点で反映する、廃番での絞り込みです。**脇に畳まず常に見えている幅で使います** —— ",
          "狭い幅では `Features/Admin/Products/List/FilterSheet` の中で同じ欄をまとめて確定します。",
          "**canvas では遷移が起きません。**",
        ].join(""),
      },
    },
  },
  args: { conditions: NO_CONDITIONS },
} satisfies Meta<typeof AdminProductDiscontinuedSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 絞り込んでいない状態。 */
export const Default: Story = {};

/** 廃番のみで絞り込んでいる状態。 */
export const Selected: Story = {
  args: { conditions: { ...NO_CONDITIONS, discontinued: DISCONTINUED_FILTER.ONLY } },
};
