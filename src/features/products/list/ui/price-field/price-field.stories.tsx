import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { PRICE_RANGE_MAX, PRICE_RANGE_MIN } from "../../price-range";
import { ProductPriceField } from "./price-field";

const meta = {
  title: "Features/Products/List/PriceField",
  component: ProductPriceField,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "価格の絞り込みです。セレクトボックスとレンジスライダーが同じ目盛りの上を動きます。",
          "**スライダーは滑らせている間、外へ伝えません**（指を離した時点だけが確定です）。",
          "セレクトボックスからは即座に伝わり、スライダーの位置もそれに追従します。",
        ].join(""),
      },
    },
  },
  args: { onChange: fn(), value: [PRICE_RANGE_MIN, PRICE_RANGE_MAX] },
  decorators: [(Story) => <div className="w-64">{Story()}</div>],
} satisfies Meta<typeof ProductPriceField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 指定が無い状態。両端が「下限なし」「上限なし」を指す。 */
export const Default: Story = {};

/** 両端を指定した状態。 */
export const Bounded: Story = {
  args: { value: [2, 5] },
};

/** 下限だけを指定した状態。 */
export const LowerOnly: Story = {
  args: { value: [3, PRICE_RANGE_MAX] },
};

/** 上限だけを指定した状態。 */
export const UpperOnly: Story = {
  args: { value: [PRICE_RANGE_MIN, 4] },
};
