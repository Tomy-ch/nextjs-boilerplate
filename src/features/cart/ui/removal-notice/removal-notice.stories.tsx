import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";

import { EARPHONE_LINE, INSUFFICIENT_LINE, WATCH_LINE } from "../../cart.fixture";
import { CartLineList } from "../line-list/line-list";
import { CartLineRow } from "../line-row/line-row";
import { CartRemovalNoticeList, CartRemovalNoticeProvider } from "./removal-notice";

const LINES = [EARPHONE_LINE, WATCH_LINE, INSUFFICIENT_LINE];

const ALL_PRESENT = LINES.map((line) => line.productId);

/** 明細を並べる。カタログでは削除が通らないため、消えたことにする商品は `present` から外して渡す。 */
function LineList({ present }: { present: readonly string[] }) {
  return (
    <CartLineList
      presentProductIds={present}
      rows={LINES.map((line, index) => (
        <CartLineRow index={index} key={line.productId} line={line} />
      ))}
    />
  );
}

const meta = {
  title: "Features/Cart/RemovalNotice",
  component: CartRemovalNoticeList,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "1 行を取り除いた直後に、戻せることを伝える表示です。**消えた行と同じ位置に出ます** —— ",
          "押した場所と案内の出る場所がずれると、どの行が消えたのかを目で辿り直すことになります。",
          "**続けて取り除いた場合はその数だけ並びます。** 先の案内を後の削除で置き換えると、戻す手段が",
          "先の 1 件だけ失われます。",
          "覚えておく場所は行の外（カートの器より外）にあります。取り除いた行はその瞬間に消えるためです。",
          "**明細がまだカートに居るなら出しません** —— 削除が通らなかった場合と、戻した直後がこれに当たります。",
          "カートを空にする操作では出しません（確認を挟んでいるため）。",
        ].join(""),
      },
    },
  },
  args: { presentProductIds: ALL_PRESENT },
  decorators: [
    (Story) => (
      <CartRemovalNoticeProvider>
        <Story />
      </CartRemovalNoticeProvider>
    ),
  ],
} satisfies Meta<typeof CartRemovalNoticeList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** まだ何も取り除いていない状態。明細だけが並ぶ。 */
export const Idle: Story = {
  render: (args) => <LineList present={args.presentProductIds} />,
};

/**
 * 真ん中の行を取り除いた直後。案内が消えた行の位置に出る。
 *
 * カタログには送信先が無いため、押した行はその場に残り、削除の失敗もあわせて出ます。実物では行が
 * 消えて案内に差し替わります。
 */
export const AfterRemoval: Story = {
  ...Idle,
  args: {
    presentProductIds: ALL_PRESENT.filter((id) => id !== WATCH_LINE.productId),
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: `${WATCH_LINE.name} を削除する` }),
    );
  },
};

/** 続けて 2 件取り除いた場合。両方が、それぞれの位置に残る。 */
export const AfterTwoRemovals: Story = {
  ...Idle,
  args: {
    presentProductIds: ALL_PRESENT.filter(
      (id) => id !== WATCH_LINE.productId && id !== EARPHONE_LINE.productId,
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole("button", { name: `${EARPHONE_LINE.name} を削除する` }));
    await userEvent.click(canvas.getByRole("button", { name: `${WATCH_LINE.name} を削除する` }));
  },
};

/** 明細が 1 つも無くなった場合。位置を持てないため、取り除いた順に積む。 */
export const WithoutLines: Story = {
  args: { presentProductIds: [] },
  render: (args) => (
    <div className="flex flex-col gap-3">
      <LineList present={args.presentProductIds} />
      <CartRemovalNoticeList presentProductIds={args.presentProductIds} />
    </div>
  ),
  play: AfterTwoRemovals.play,
};
