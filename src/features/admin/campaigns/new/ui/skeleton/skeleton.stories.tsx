import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AdminCampaignCreateSkeleton } from "./skeleton";

const meta = {
  title: "Features/Admin/Campaigns/New/Skeleton",
  component: AdminCampaignCreateSkeleton,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "キャンペーンを定義する画面の待機表示です。欄の群と送る操作を、出来上がりと同じ並びで出します。",
      },
    },
  },
} satisfies Meta<typeof AdminCampaignCreateSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。 */
export const Default: Story = {};
