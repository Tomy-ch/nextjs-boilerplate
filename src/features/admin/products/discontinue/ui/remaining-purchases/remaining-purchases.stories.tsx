import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ADMIN_PRODUCT_LIST_PATH } from "../../../../paths";
import { REMAINING_PURCHASES } from "../../discontinue.fixture";
import { DiscontinueRemainingPurchases } from "./remaining-purchases";

const meta = {
  title: "Features/Admin/Products/Discontinue/RemainingPurchases",
  component: DiscontinueRemainingPurchases,
  parameters: {
    layout: "padded",
    nextjs: { navigation: { pathname: ADMIN_PRODUCT_LIST_PATH } },
    docs: {
      description: {
        component: [
          "廃番を拒ませている進行中の購入です。**行はどこへもつながりません**（管理側に購入 1 件を開く面が無いため）。",
          "全件でないときと、読めなかったときは、この場所だけで伝えます。",
        ].join(""),
      },
    },
  },
  args: {
    state: { status: "ready", items: REMAINING_PURCHASES, partial: false },
    reloadHref: `${ADMIN_PRODUCT_LIST_PATH}/0195f0c2-0000-7000-8000-000000000001/discontinue`,
  },
} satisfies Meta<typeof DiscontinueRemainingPurchases>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 残っている購入がすべて並んだ状態。 */
export const Default: Story = {};

/** 狭い幅。日時と合計は購入コードの下へ回る。 */
export const Mobile: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
};

/** 全件ではない状態。並んでいない購入があることを添える。 */
export const Partial: Story = {
  args: { state: { status: "ready", items: REMAINING_PURCHASES.slice(0, 2), partial: true } },
};

/** 読み込み中。行の数は実際の件数に合わせない。 */
export const Loading: Story = {
  args: { state: { status: "loading" } },
};

/** 読めなかった状態。取り直す導線を置く。 */
export const Failed: Story = {
  args: { state: { status: "failed" } },
};
