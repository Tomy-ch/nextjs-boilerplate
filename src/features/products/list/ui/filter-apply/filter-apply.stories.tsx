import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { ProductFilterApply } from "./filter-apply";

const meta = {
  title: "Features/Products/List/FilterApply",
  component: ProductFilterApply,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "絞り込みを確定する操作です。押すまで一覧は変わらず、代わりに押す前の該当件数が出ます。",
          "**canvas では追従しません**（下へ読み進めているあいだ引っ込む挙動は、スクロールする器の",
          "中でしか現れません）。",
        ].join(""),
      },
    },
  },
  args: { count: 128, onApply: fn() },
  decorators: [(Story) => <div className="w-64">{Story()}</div>],
} satisfies Meta<typeof ProductFilterApply>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 件数が分かっている状態。 */
export const Default: Story = {};

/** 数え直している最中。1 つ前の件数を薄くして残す。 */
export const Counting: Story = {
  args: { counting: true },
};

/** まだ一度も数えていない状態。数の行は高さだけ空けておく。 */
export const Unknown: Story = {
  args: { count: undefined, counting: true },
};

/** 一致するものが無い状態。押せることは変えない。 */
export const NoMatch: Story = {
  args: { count: 0 },
};

/** 反映の取得が終わっていない状態。二重に押せないようにする。 */
export const Pending: Story = {
  args: { pending: true },
};
