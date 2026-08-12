import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { type CartLineInput, useCartStore } from "@/stores/cart-store";

import { CartHeaderAction } from "./header-action";

const EARPHONE: CartLineInput = {
  productId: "0195f0c2-0000-7000-8000-000000000001",
  name: "ワイヤレスイヤホン",
  price: "19.99",
  statusName: "公開",
  imageUrl: null,
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

function seed(lines: readonly CartLineInput[]) {
  useCartStore.setState({ lines: [] });
  for (const line of lines) {
    useCartStore.getState().add(line);
  }
}

const meta = {
  title: "Features/Cart/HeaderAction",
  component: CartHeaderAction,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "header に置くカートの入口です。**幅で姿が変わります。** 脇に常設できる幅では点数だけを出し、",
          "狭い幅では本文へ被せる drawer の引き手になります。canvas の幅を変えると切り替わります。",
          "引き出す操作は押下だけで、画面端からの swipe は持ちません（browser の戻る操作と競合するため）。",
        ].join(""),
      },
    },
  },
  decorators: [
    (Story) => {
      seed([EARPHONE, WATCH]);

      return <Story />;
    },
  ],
} satisfies Meta<typeof CartHeaderAction>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 脇に常設できる幅。点数だけを出し、開く操作を持たない。 */
export const Wide: Story = {};

/** 狭い幅。押すと本文へ被せて開き、背面の押下と「閉じる」のどちらでも閉じる。 */
export const Narrow: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
};

/** 狭い幅でカートが空の場合。入っていないことを drawer の説明で伝える。 */
export const NarrowEmpty: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
  decorators: [
    (Story) => {
      seed([]);

      return <Story />;
    },
  ],
};
