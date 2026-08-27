import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { useCartStore } from "@/stores/cart-store";

import { CART, CART_WITH_ISSUES, EMPTY_CART } from "../../cart.fixture";
import { CartHeaderAction } from "./header-action";

/** 中身を見たいという要求を、story の初期状態として指定する。 */
function seedOpen(isOpen: boolean) {
  useCartStore.setState({ isOpen });
}

const meta = {
  title: "Features/Cart/HeaderAction",
  component: CartHeaderAction,
  parameters: {
    layout: "centered",
    docs: {
      story: { inline: false, iframeHeight: 640 },
      description: {
        component: [
          "header に置くカートの入口です。**幅で姿が変わります。** 脇に常設できる PC では点数だけを出し、",
          "タブレットとスマホでは本文へ被せる drawer の引き手になります（境界は `lg` = 1024px）。",
          "引き出す操作は押下だけで、画面端からの swipe は持ちません（browser の戻る操作と競合するため）。",
        ].join(""),
      },
    },
  },
  args: { cart: CART },
  decorators: [
    (Story) => {
      seedOpen(false);

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
      seedOpen(true);

      return <Story />;
    },
  ],
};

/** スマホで買えない明細を含む場合。事情は行ごとに出る。 */
export const MobileWithIssues: Story = {
  args: { cart: CART_WITH_ISSUES },
  globals: { viewport: { value: "mobile2", isRotated: false } },
  decorators: [
    (Story) => {
      seedOpen(true);

      return <Story />;
    },
  ],
};

/** スマホでカートが空の場合。入っていないことを drawer の説明で伝える。 */
export const MobileEmpty: Story = {
  args: { cart: EMPTY_CART },
  globals: { viewport: { value: "mobile2", isRotated: false } },
};
