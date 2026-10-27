import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ISSUE_RECIPIENT, LONG_NAME_RECIPIENT } from "../../coupon-new.fixture";
import { IssueRecipientCard } from "./recipient-card";

const meta = {
  title: "Features/Admin/Users/CouponNew/RecipientCard",
  component: IssueRecipientCard,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "クーポンの発行先です。発行先は URL で決まり、ここでは表示するだけで選ばせません。",
      },
    },
  },
  args: { recipient: ISSUE_RECIPIENT },
} satisfies Meta<typeof IssueRecipientCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。 */
export const Default: Story = {};

/** 契約が許す最大長の姓名と、長いメールアドレス。折り返して枠に収まる。 */
export const LongName: Story = {
  args: { recipient: LONG_NAME_RECIPIENT },
};

/** 狭い幅。語と値を縦に積む。 */
export const LongNameMobile: Story = {
  args: { recipient: LONG_NAME_RECIPIENT },
  globals: { viewport: { value: "mobile2", isRotated: false } },
};
