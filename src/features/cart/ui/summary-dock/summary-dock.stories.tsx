import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { CART } from "../../cart.fixture";
import { CartSummaryCard } from "../summary-card/summary-card";
import { CartSummaryDock } from "./summary-dock";

const meta = {
  title: "Features/Cart/SummaryDock",
  component: CartSummaryDock,
  parameters: {
    layout: "fullscreen",
    docs: {
      story: { inline: false, iframeHeight: 640 },
      description: {
        component: [
          "集計を画面の下から出す引き出しです。**脇に領域を置けない幅だけで使います**（`lg` 未満）。",
          "**下へ読み進めるあいだだけ出ます。** 明細が増えるほど小計は画面外へ遠ざかるためで、",
          "上へ戻るときは読みたいのが明細そのものなので置いて行かれる形で隠れます。",
          "**つまみはいつでも出ています。** 向きに任せるだけだと、下へ動かせない位置で小計へ到達できません。",
        ].join(""),
      },
    },
  },
  args: { children: <CartSummaryCard cart={CART} /> },
  decorators: [
    (Story) => (
      <div className="flex flex-col gap-4 p-4">
        <p className="text-muted-foreground text-sm">
          下へスクロールすると集計が出て、上へ戻ると隠れます。つまみを押すと固定されます。
        </p>
        <div className="h-[150vh] rounded-md border border-dashed" />
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CartSummaryDock>;

export default meta;
type Story = StoryObj<typeof meta>;

/** スマホ。初期状態では隠れており、つまみだけが出ている。 */
export const Mobile: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
};

/** タブレット。脇に領域を置けないため、スマホと同じく引き出しが受け持つ。 */
export const Tablet: Story = {
  globals: { viewport: { value: "tablet", isRotated: false } },
};

/** PC。脇に貼り付く集計があるため、器ごと出さない。 */
export const PC: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
};
