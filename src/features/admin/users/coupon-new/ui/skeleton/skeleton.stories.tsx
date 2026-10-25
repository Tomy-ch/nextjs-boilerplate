import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AdminUserCouponNewSkeleton } from "./skeleton";

const meta = {
  title: "Features/Admin/Users/CouponNew/Skeleton",
  component: AdminUserCouponNewSkeleton,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "利用者 1 人にクーポンを発行する画面の待機表示です。発行先と欄の群と送る操作を、出来上がりと同じ並びで出します。",
      },
    },
  },
} satisfies Meta<typeof AdminUserCouponNewSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。 */
export const Default: Story = {};
