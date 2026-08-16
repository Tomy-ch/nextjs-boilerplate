import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useEffect } from "react";

import type { CartLine } from "@/model/cart/cart";

import { EARPHONE_LINE, INSUFFICIENT_LINE, WATCH_LINE } from "../../cart.fixture";
import { CartRemovalNoticeProvider, useCartRemovalNotice } from "../../removal-memory";
import { CartLineList } from "../line-list/line-list";
import { CartLineRow } from "../line-row/line-row";
import { CartRemovalNoticeList } from "./removal-notice";

const LINES = [EARPHONE_LINE, WATCH_LINE, INSUFFICIENT_LINE];

const ALL_IDS = LINES.map((line) => line.productId);

/**
 * 取り除いた直後の状態をカタログで作る。
 *
 * @remarks
 * カタログには送信先が無いため、実物の削除は通りません。器が覚える内容（取り除いた明細と、そのとき
 * 画面が並べていた順）を直接与えて、同じ姿を再現します。
 */
function SeedRemovals({ lines }: { lines: readonly CartLine[] }) {
  const notice = useCartRemovalNotice();
  const notify = notice?.notify;

  useEffect(() => {
    // 実物と同じ順で与える。2 件目を取り除く時点では、1 件目は既に画面から消えている。
    let displayed = ALL_IDS;

    for (const line of lines) {
      notify?.(
        { productId: line.productId, name: line.name ?? "", quantity: line.quantity },
        displayed,
      );
      displayed = displayed.filter((id) => id !== line.productId);
    }
  }, [notify, lines]);

  return null;
}

/** 取り除いたことにする明細を除いて並べる。 */
function LineList({ removed }: { removed: readonly CartLine[] }) {
  const present = LINES.filter((line) => !removed.includes(line));

  return (
    <>
      <SeedRemovals lines={removed} />
      <CartLineList
        slots={present.map((line) => ({
          productId: line.productId,
          row: <CartLineRow key={line.productId} line={line} />,
        }))}
      />
    </>
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
          "1 行を取り除いた直後に、戻せることを伝える表示です。**消えた行と同じ場所に出ます** —— ",
          "押した場所と案内の出る場所がずれると、どの行が消えたのかを目で辿り直すことになります。",
          "**場所は番号ではなく、画面が見せていた並びで持ちます。** 番号はほかの行が増減するたびに",
          "指す先が変わり、続けて取り除くとずれます。",
          "**続けて取り除いた場合はその数だけ並びます。** 先の案内を後の削除で置き換えると、戻す手段が",
          "先の 1 件だけ失われます。",
          "**明細がまだカートに居るなら出しません** —— 削除が通らなかった場合と、戻した直後がこれに当たります。",
          "カートを空にする操作では出しません（確認を挟んでいるため）。",
        ].join(""),
      },
    },
  },
  args: { presentProductIds: ALL_IDS },
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
  render: () => <LineList removed={[]} />,
};

/** 真ん中の行を取り除いた直後。案内が消えた行の場所に出る。 */
export const AfterRemoval: Story = {
  render: () => <LineList removed={[WATCH_LINE]} />,
};

/** 続けて 2 件取り除いた場合。両方が、それぞれの場所に残る。 */
export const AfterTwoRemovals: Story = {
  render: () => <LineList removed={[EARPHONE_LINE, WATCH_LINE]} />,
};

/** 明細が 1 つも無くなった場合。並べる相手が無いため、取り除いた順に積む。 */
export const WithoutLines: Story = {
  args: { presentProductIds: [] },
  render: (args) => (
    <div className="flex flex-col gap-3">
      <SeedRemovals lines={LINES} />
      <CartRemovalNoticeList presentProductIds={args.presentProductIds} />
    </div>
  ),
};
