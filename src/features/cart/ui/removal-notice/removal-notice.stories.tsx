import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";

import { EARPHONE_LINE, WATCH_LINE } from "../../cart.fixture";
import { CartLineRow } from "../line-row/line-row";
import { CartRemovalNotice, CartRemovalNoticeProvider } from "./removal-notice";

const meta = {
  title: "Features/Cart/RemovalNotice",
  component: CartRemovalNotice,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "1 行を取り除いた直後に、戻せることを伝える表示です。**取り除いた行はその瞬間に消える**ため、",
          "覚えておく場所を行の外に置いています。",
          "**明細がまだカートに居るなら出しません** —— 削除が通らなかった場合と、戻した直後がこれに当たります。",
          "カートを空にする操作では出しません（確認を挟んでいるため）。",
        ].join(""),
      },
    },
  },
  decorators: [
    (Story) => (
      <CartRemovalNoticeProvider>
        <div className="flex flex-col gap-3">
          <Story />
          <ul className="flex flex-col divide-y border-y">
            <CartLineRow line={EARPHONE_LINE} />
          </ul>
        </div>
      </CartRemovalNoticeProvider>
    ),
  ],
} satisfies Meta<typeof CartRemovalNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

/** まだ何も取り除いていない状態。何も出さない。 */
export const Idle: Story = {
  args: { presentProductIds: [EARPHONE_LINE.productId] },
};

/**
 * 取り除いた直後。
 *
 * カタログでは削除そのものは通らないため、既にカートから消えている商品を指した状態で出しています。
 */
export const AfterRemoval: Story = {
  args: { presentProductIds: [EARPHONE_LINE.productId] },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: `${WATCH_LINE.name} を削除する` }),
    );
  },
  decorators: [
    (Story) => (
      <CartRemovalNoticeProvider>
        <div className="flex flex-col gap-3">
          <Story />
          <ul className="flex flex-col divide-y border-y">
            <CartLineRow line={WATCH_LINE} />
          </ul>
        </div>
      </CartRemovalNoticeProvider>
    ),
  ],
};
