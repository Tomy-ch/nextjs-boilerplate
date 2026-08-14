import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { WithdrawBand } from "./withdraw-band";

const meta = {
  title: "Features/Account/WithdrawBand",
  component: WithdrawBand,
  parameters: {
    docs: {
      description: {
        component: [
          "退会の導線です。**送信そのものはカタログでは動きません** —— 実行は Server Action で、",
          "ここで確かめられるのは確認 dialog の文言と、破壊的操作としての見え方までです。",
        ].join(""),
      },
    },
  },
} satisfies Meta<typeof WithdrawBand>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。dialog は閉じており、帯だけが出ている。 */
export const Default: Story = {};

/** スマホ幅。帯と操作が縦に収まるかを見る。 */
export const Mobile: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
};
