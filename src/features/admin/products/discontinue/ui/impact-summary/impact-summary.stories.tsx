import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ADMIN_PRODUCT_LIST_PATH } from "../../../../paths";
import { BLOCKED_IMPACT, OPEN_IMPACT, UNTOUCHED_IMPACT } from "../../discontinue.fixture";
import { DiscontinueImpactSummary } from "./impact-summary";

const meta = {
  title: "Features/Admin/Products/Discontinue/ImpactSummary",
  component: DiscontinueImpactSummary,
  parameters: {
    layout: "padded",
    nextjs: { navigation: { pathname: ADMIN_PRODUCT_LIST_PATH } },
    docs: {
      description: {
        component: [
          "廃番にしたときの影響の見積もりです。**実行の結果ではありません** —— 読み込んだ時点の値で、",
          "取り直す導線を添えています。3 つの数は数えている母集団が違うため、値ごとに注記を置きます。",
        ].join(""),
      },
    },
  },
  args: {
    impact: OPEN_IMPACT,
    reloadHref: `${ADMIN_PRODUCT_LIST_PATH}/0195f0c2-0000-7000-8000-000000000001/discontinue`,
  },
} satisfies Meta<typeof DiscontinueImpactSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 実行できる見積もり。 */
export const Default: Story = {};

/** 狭い幅。数は縦に積まれ、取り直す操作は見出しの脇から下へ回る。 */
export const Mobile: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
};

/** どのカートにも入っていない。0 は数としてそのまま出し、クーポンが出ないことを添える。 */
export const Untouched: Story = {
  args: { impact: UNTOUCHED_IMPACT },
};

/** 進行中の購入が残っている。 */
export const Blocked: Story = {
  args: { impact: BLOCKED_IMPACT },
};
