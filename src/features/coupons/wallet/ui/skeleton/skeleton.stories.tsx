import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { WalletSkeleton } from "./skeleton";

const meta = {
  title: "Features/Coupons/Wallet/Skeleton",
  component: WalletSkeleton,
} satisfies Meta<typeof WalletSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。受け取り欄と一覧の行の器。 */
export const Default: Story = {};
