import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { STOCK_AVAILABILITY } from "../../stock-availability";
import { ProductStockField } from "./stock-field";

const meta = {
  title: "Features/Products/List/StockField",
  component: ProductStockField,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "在庫状況の絞り込みです。3 つの状態は互いに排他なので radio で表します。",
          "契約が受け取るのは在庫数の下限と上限で、有無との橋渡しはこの画面が持ちます。",
          "**canvas では選んでも見た目が変わりません**（選択を持つのは呼び出し元です）。",
        ].join(""),
      },
    },
  },
  args: { onChange: fn(), value: STOCK_AVAILABILITY.ALL },
  decorators: [(Story) => <div className="w-64">{Story()}</div>],
} satisfies Meta<typeof ProductStockField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 在庫を条件にしない状態。 */
export const Default: Story = {};

/** 在庫があるものだけに絞った状態。 */
export const InStock: Story = {
  args: { value: STOCK_AVAILABILITY.IN_STOCK },
};

/** 在庫が無いものだけに絞った状態。 */
export const OutOfStock: Story = {
  args: { value: STOCK_AVAILABILITY.OUT_OF_STOCK },
};
