import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AdminInquiryListSkeleton } from "./skeleton";

const meta = {
  title: "Features/Admin/Inquiries/List/Skeleton",
  component: AdminInquiryListSkeleton,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "問い合わせ一覧の待機表示です。何件あるかは取得しないと分からないため、画面に無理なく収まる数の行を枠で出します。",
      },
    },
  },
} satisfies Meta<typeof AdminInquiryListSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。 */
export const Default: Story = {};
