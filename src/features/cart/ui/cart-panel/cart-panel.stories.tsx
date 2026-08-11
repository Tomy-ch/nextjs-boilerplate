import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { type CartLineInput, useCartStore } from "@/stores/cart-store";

import { CartPanel } from "./cart-panel";

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

function seed(lines: readonly CartLineInput[], quantities: readonly number[] = []) {
  useCartStore.setState({ lines: [] });
  lines.forEach((line, index) => {
    useCartStore.getState().add(line);
    const quantity = quantities[index];

    if (quantity !== undefined) {
      useCartStore.getState().setQuantity(line.productId, quantity);
    }
  });
}

const meta = {
  title: "Features/Cart/CartPanel",
  component: CartPanel,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "本文の脇に出すカートです。**canvas でも状態が変わります。** 数量を増減すると小計が動き、",
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
