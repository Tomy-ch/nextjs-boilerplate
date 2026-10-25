import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ClaimSubmitButton } from "./submit-button";

const meta = {
  title: "Features/Coupons/Wallet/SubmitButton",
  component: ClaimSubmitButton,
  decorators: [
    (Story) => (
      <form>
        <Story />
      </form>
    ),
  ],
} satisfies Meta<typeof ClaimSubmitButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 押せる。 */
export const Default: Story = {};
