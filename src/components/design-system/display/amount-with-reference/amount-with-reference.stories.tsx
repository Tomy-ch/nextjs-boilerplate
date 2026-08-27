import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AmountWithReference } from "./amount-with-reference";

const meta = {
  title: "Display/AmountWithReference",
  component: AmountWithReference,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "金額と、切り替えで現れる参考換算額です。",
          "**基準通貨の金額は常に出したまま**で、切り替えが足すのは参考の 1 行だけです。",
          "参考換算額が読めなかったときは、切り替えの操作ごと出しません。",
        ].join(""),
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="w-80 rounded-lg border p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AmountWithReference>;

/** 参考換算額の例。レートと基準日は「いつの相場か」を示すために必ず添える。 */
const REFERENCE = {
  currency: "JPY",
  amount: 28_346,
  rate: "150.00",
  rateDate: "2026-08-17",
};

export default meta;
type Story = StoryObj<typeof meta>;

/** 参考換算額を引けた状態。切り替えを押すと参考の行が現れる。 */
export const WithReference: Story = {
  args: { amount: 18_897, label: "小計", reference: REFERENCE },
};

/** 参考換算額を引けなかった状態。切り替えを出さない。 */
export const WithoutReference: Story = {
  args: { amount: 18_897, label: "小計", reference: null },
};

/** 脇に添える大きさ。器の中で他の情報と並ぶときに使う。 */
export const Compact: Story = {
  args: { amount: 21_287, label: "合計", reference: REFERENCE, size: "compact" },
};
