import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { InvalidQueryFeedback } from "./invalid-query-feedback";

const KEY_LABELS = {
  categoryCodes: "分類",
  keyword: "キーワード",
  after: "読み込み位置",
};

const meta = {
  title: "Feedback/InvalidQueryFeedback",
  component: InvalidQueryFeedback,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "URL に載った条件が契約を外れているときに、本体の代わりに出します。**範囲外の条件を捨てて",
          "既定の結果を出す選択肢を持ちません** —— 捨てると、絞り込んだつもりの利用者が絞り込まれていない",
          "結果を、それと判らないまま読みます。キーの呼び名も戻す先も持たず、呼び出し元から受け取ります。",
        ].join(""),
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="w-[32rem] max-w-[calc(100vw-2rem)]">
        <Story />
      </div>
    ),
  ],
  args: {
    title: "この条件では商品を表示できません",
    message: "入力内容が正しくありません。再度ご確認ください。",
    invalidKeys: ["categoryCodes"],
    keyLabels: KEY_LABELS,
    resetHref: "/products",
    resetLabel: "条件を外して一覧を見る",
  },
} satisfies Meta<typeof InvalidQueryFeedback>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 1 つの条件が契約を外れている状態。 */
export const Default: Story = {};

/** 複数が外れている状態。呼び名を並べて示す。 */
export const MultipleKeys: Story = {
  args: { invalidKeys: ["categoryCodes", "keyword", "after"] },
};

/** 表に無いキーが混ざる状態。呼び名を持たないキーはそのまま出す。 */
export const UnknownKey: Story = { args: { invalidKeys: ["categoryCodes", "sort"] } };

/** どのキーが外れたか判らない状態。確認する条件の行を出さない。 */
export const NoKeys: Story = { args: { invalidKeys: [] } };

/** 題と導線を差し替えた場合。画面ごとに何を出せないのかが違う。 */
export const OtherScreen: Story = {
  args: {
    title: "この期間では集計を表示できません",
    invalidKeys: ["period"],
    keyLabels: { period: "期間の区分" },
    resetHref: "/admin/analytics",
    resetLabel: "期間を外して見る",
  },
};
