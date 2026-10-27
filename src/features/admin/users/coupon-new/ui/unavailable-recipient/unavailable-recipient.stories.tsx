import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { UnavailableRecipient } from "./unavailable-recipient";

const meta = {
  title: "Features/Admin/Users/CouponNew/UnavailableRecipient",
  component: UnavailableRecipient,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "発行先へ発行できないことの面です。開いた時点で退会済みだったときと、送ったときに発行先が",
          "退会したか見つからなかったときの 2 つで、どちらも利用者一覧へ戻る行き先だけを置きます。",
        ].join(""),
      },
    },
  },
  args: { reason: "withdrawn" },
} satisfies Meta<typeof UnavailableRecipient>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 開いた時点で退会済みだった。 */
export const Withdrawn: Story = {};

/** 送ったときに発行先を失った。 */
export const Lost: Story = {
  args: { reason: "lost" },
};
