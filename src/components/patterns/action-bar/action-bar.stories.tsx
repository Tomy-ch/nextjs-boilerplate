import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "@/components/design-system/action/button/button";

import { ActionBar } from "./action-bar";
import { ACTION_BAR_POSITION } from "./action-bar.definition";

const meta = {
  title: "Container/ActionBar",
  component: ActionBar,
  parameters: {
    docs: {
      description: {
        component: [
          "操作をまとめて置く領域です。位置と重なり順だけを持ち、中身が何であるかを知りません。",
          "下端に固定する位置は overlay より下・本文より上の重なり順と、ホームバーを避ける余白を含みます。",
        ].join(""),
      },
    },
  },
  args: {
    children: (
      <>
        <Button size="sm" type="button" variant="outline">
          下書きに戻す
        </Button>
        <Button size="sm" type="button">
          公開する
        </Button>
      </>
    ),
  },
} satisfies Meta<typeof ActionBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 本文の流れの中に置く。枠と面の色で区切る。 */
export const Inline: Story = {};

/** scroll 領域の下端に貼り付ける。上辺の border だけで本文と切り分ける。 */
export const Sticky: Story = {
  args: { position: ACTION_BAR_POSITION.STICKY },
  decorators: [
    (Story) => (
      <div className="h-40 overflow-y-auto border border-border">
        <p className="p-3 text-sm">下端に貼り付く様子を見るための送りです。</p>
        <div className="h-40" />
        <Story />
      </div>
    ),
  ],
};

/** viewport の下端に固定する。canvas の下端に出る。 */
export const Fixed: Story = {
  args: { position: ACTION_BAR_POSITION.FIXED },
};

/** 脇に領域を持てない帯だけ固定する。canvas の幅を lg の前後で変えると位置が変わる。 */
export const FixedWithoutAside: Story = {
  args: { position: ACTION_BAR_POSITION.FIXED_WITHOUT_ASIDE },
};

/** 脇に領域を持てない帯での見え方。固定された状態になる。 */
export const FixedWithoutAsideMobile: Story = {
  args: { position: ACTION_BAR_POSITION.FIXED_WITHOUT_ASIDE },
  globals: { viewport: { value: "mobile2", isRotated: false } },
};
