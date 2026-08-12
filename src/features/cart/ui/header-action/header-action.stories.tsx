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

/** 初期状態を作る。追加が立てた「見たい」要求は、種まきの副産物なので畳む。 */
function seed(lines: readonly CartLineInput[], isOpen = false) {
  useCartStore.setState({ lines: [] });
  for (const line of lines) {
    useCartStore.getState().add(line);
  }
  useCartStore.setState({ isOpen });
}

const meta = {
  title: "Features/Cart/HeaderAction",
  component: CartHeaderAction,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "header に置くカートの入口です。**幅で姿が変わります。** 脇に常設できる PC では点数だけを出し、",
          "タブレットとスマホでは本文へ被せる drawer の引き手になります（境界は `lg` = 1024px）。",
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

/** PC。脇に常設できるため点数だけを出し、開く操作を持たない。 */
export const PC: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** タブレット。脇に常設できないため、スマホと同じく引き手になる。 */
export const Tablet: Story = {
  globals: { viewport: { value: "tablet", isRotated: false } },
};

/** スマホ。押すと本文へ被せて開き、背面の押下と「閉じる」のどちらでも閉じる。 */
export const Mobile: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
};

/** スマホで開いた状態。商品をカートへ入れたときもこの姿になる。 */
export const MobileOpen: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
  decorators: [
    (Story) => {
      seed([EARPHONE, WATCH], true);

      return <Story />;
    },
  ],
};

/** スマホでカートが空の場合。入っていないことを drawer の説明で伝える。 */
export const MobileEmpty: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
  decorators: [
    (Story) => {
      seed([]);

      return <Story />;
    },
  ],
};
