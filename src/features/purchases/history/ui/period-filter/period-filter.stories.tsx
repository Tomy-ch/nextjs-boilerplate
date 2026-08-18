import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { PurchasePeriodFilter } from "./period-filter";

const meta = {
  title: "Features/Purchases/PeriodFilter",
  component: PurchasePeriodFilter,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "期間で絞る操作です。**区分を選ぶと、その区分が使う入力欄だけが現れます。**",
          "確定を押すまで一覧は変わりません。開始日と終了日のように、",
          "2 つ揃って初めて条件になる指定があるためです。",
        ].join(""),
      },
    },
  },
} satisfies Meta<typeof PurchasePeriodFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。全期間で、追加の入力欄を持たない。 */
export const AllPeriod: Story = {
  args: { period: { kind: "all" } },
};

/** 直近 N 日。日数の選択肢だけが現れる。 */
export const Recent: Story = {
  args: { period: { kind: "recent", days: 30 } },
};

/** 暦月。月の入力欄が現れる。 */
export const Month: Story = {
  args: { period: { kind: "month", month: "2026-07" } },
};

/** 開始日と終了日。終了日は開始日より前を選べない。 */
export const Range: Story = {
  args: { period: { kind: "range", from: "2026-06-01", to: "2026-08-17" } },
};
