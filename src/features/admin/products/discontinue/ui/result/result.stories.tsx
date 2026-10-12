import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { DISCONTINUE_RESULT } from "../../discontinue.fixture";
import { DiscontinueResult } from "./result";

const meta = {
  title: "Features/Admin/Products/Discontinue/Result",
  component: DiscontinueResult,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "廃番を実行した結果です。**見積もりではなく実行の応答の数を出します。**",
          "件数は応答にしか無いため、読み込み直すと廃番日時だけが残ることを添えます。",
        ].join(""),
      },
    },
  },
  args: { result: DISCONTINUE_RESULT },
} satisfies Meta<typeof DiscontinueResult>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 応答の 4 項目。 */
export const Default: Story = {};

/** 狭い幅。項目名と値が縦に並ぶ。 */
export const Mobile: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
};

/** どのカートにも入っていなかった商品。0 件・0 枚もそのまま出す。 */
export const Untouched: Story = {
  args: {
    result: {
      ...DISCONTINUE_RESULT,
      affectedCartCount: 0,
      affectedUserCount: 0,
      issuedCouponCount: 0,
    },
  },
};
