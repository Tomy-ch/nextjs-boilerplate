import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { type CartLineInput, useCartStore } from "@/stores/cart-store";

import { CartPanel } from "./panel";

const EARPHONE: CartLineInput = {
  productId: "0195f0c2-0000-7000-8000-000000000001",
  name: "ワイヤレスイヤホン",
  price: "19.99",
  statusName: "公開",
  imageUrl: "/src/components/design-system/display/media-image/invertocat.png",
  stockQuantity: 12,
};

const WATCH: CartLineInput = {
  productId: "0195f0c2-0000-7000-8000-000000000002",
  name: "スマートウォッチ（第 2 世代・GPS 搭載モデル）",
  price: "129.00",
  statusName: "残りわずか",
  imageUrl: null,
  stockQuantity: 2,
};

const LONG_STATUS: CartLineInput = {
  productId: "0195f0c2-0000-7000-8000-000000000003",
  name: "編組ケーブル 2m",
  price: "0.99",
  statusName: "取り寄せのため出荷までに時間がかかります",
  imageUrl: null,
  stockQuantity: 30,
};

/**
 * 明細を積み、開いた状態にする。
 *
 * 種まきは初期状態の再現であって追加操作ではないため、追加が立てた開く要求はここで明示し直す。
 */
function seed(lines: readonly CartLineInput[], quantities: readonly number[] = [], isOpen = true) {
  useCartStore.setState({ lines: [] });
  lines.forEach((line, index) => {
    useCartStore.getState().add(line);
    const quantity = quantities[index];

    if (quantity !== undefined) {
      useCartStore.getState().setQuantity(line.productId, quantity);
    }
  });
  useCartStore.setState({ isOpen });
}

const meta = {
  title: "Features/Cart/Panel",
  component: CartPanel,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "本文の脇に出すカートです。狭い幅では出しません（`CartHeaderAction` が被せる形で受け持つ）。",
          "**閉じると領域ごと消えます。** 本文から 280px 前後を持っていくため、閉じられないと",
          "一度カートへ入れた利用者は本文を狭いまま読み続けることになります。開き直す入口は header です。",
          "1 から減らすと明細が消えます。小計と「カートに移動」は送りの外に置くため、",
          "明細が画面の高さを超えても見失いません。",
        ].join(""),
      },
    },
  },
} satisfies Meta<typeof CartPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 明細が複数ある状態。片方は在庫の上限に達している。 */
export const WithLines: Story = {
  decorators: [
    (Story) => {
      seed([EARPHONE, WATCH], [3, 2]);

      return <Story />;
    },
  ],
};

/** 明細が 1 件だけの状態。数量 1 なので減らす操作が削除になる。 */
export const SingleLine: Story = {
  decorators: [
    (Story) => {
      seed([EARPHONE]);

      return <Story />;
    },
  ],
};

/** 空の状態。枠ごと描画しない。 */
export const Empty: Story = {
  decorators: [
    (Story) => {
      seed([]);

      return <Story />;
    },
  ],
};

/** 状態名が長い明細。名前の幅を奪わないよう、収まらない状態名だけが次の行へ送られる。 */
export const LongStatusName: Story = {
  decorators: [
    (Story) => {
      seed([LONG_STATUS, WATCH]);

      return <Story />;
    },
  ],
};

/** 閉じた状態。中身はあるが領域ごと出さない。 */
export const Closed: Story = {
  decorators: [
    (Story) => {
      seed([EARPHONE], [], false);

      return <Story />;
    },
  ],
};
