import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { useCartStore } from "@/stores/cart-store";

import { AddToCartButton } from "./add-to-cart-button";

const LINE = {
  productId: "0195f0c2-0000-7000-8000-000000000001",
  name: "ワイヤレスイヤホン",
  price: "19.99",
  statusName: "公開",
  imageUrl: null,
  stockQuantity: 3,
};

const meta = {
  title: "Features/Products/AddToCartButton",
  component: AddToCartButton,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "カートへ入れる操作です。**canvas でも状態が変わります。** 押すと `stores` のカートが増え、",
          "在庫ぶんすべて入った時点で押せなくなります。story を開くたびにカートは空へ戻します。",
        ].join(""),
      },
    },
  },
  decorators: [
    (Story) => {
      useCartStore.setState({ lines: [] });

      return <Story />;
    },
  ],
} satisfies Meta<typeof AddToCartButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。在庫が残っている状態。 */
export const Default: Story = {
  args: { line: LINE },
};

/** 在庫が無い商品。押せない。 */
export const OutOfStock: Story = {
  args: { line: { ...LINE, stockQuantity: 0 } },
};

/** 一覧の 1 件に添える形。幅を占めず、内容の幅に収まる。 */
export const Compact: Story = {
  args: { compact: true, line: LINE },
};

/** 狭い幅での既定の形。画面の主操作として幅いっぱいに広がる。 */
export const PrimaryOnMobile: Story = {
  args: { line: LINE },
  globals: { viewport: { value: "mobile2", isRotated: false } },
  parameters: { layout: "padded" },
};
