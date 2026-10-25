import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { MypageCouponsLink } from "./coupons-link";

const meta = {
  title: "Features/Account/Mypage/CouponsLink",
  component: MypageCouponsLink,
} satisfies Meta<typeof MypageCouponsLink>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。行全体が保有クーポンへの導線になる。 */
export const Default: Story = {};
