import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";

import { CartClearButton } from "./clear-button";

const meta = {
  title: "Features/Cart/ClearButton",
  component: CartClearButton,
  parameters: {
    layout: "centered",
    docs: {
      story: { inline: false, iframeHeight: 420 },
      description: {
        component: [
          "カートの明細をすべて取り除く操作です。**確認を挟みます。** 1 行の削除と違って、",
          "戻すには入れ直す商品を思い出す必要があり、押し間違いの代償が行数に比例します。",
          "確認は `AlertDialogAction` ではなく form の submit で行います（送信中の表示と失敗の文言を",
          "利用者が見ている場所に出すため）。",
        ].join(""),
      },
    },
  },
} satisfies Meta<typeof CartClearButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。押すと確認を開く。 */
export const Default: Story = {};

/** 確認を開いた状態。 */
export const Confirming: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "カートを空にする" }));
  },
};
