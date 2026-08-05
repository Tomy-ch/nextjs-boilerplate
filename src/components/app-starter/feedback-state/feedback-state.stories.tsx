import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FeedbackState } from "./feedback-state";
import { FEEDBACK_STATE_KIND } from "./feedback-state.definition";

const meta = {
  title: "View State/FeedbackState",
  component: FeedbackState,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "**領域や画面まるごと**の表示状態を、loading / empty / error / success の 4 つで一貫して伝えます。",
          "文脈の中に差し込む注意書きは `Alert`、form の送信結果は `FormFeedback`、",
          "一時的な通知は `Toaster` を使います。区別の基準は「その領域に本来出るはずの内容の",
          "代わりに置くかどうか」です。",
          "`role` と `aria-live` を自身が持つため、状態の読み上げはここに集約します。",
          "**状態の判定・文言・次に取る行動は呼び出し元が渡します。**",
        ].join(""),
      },
    },
  },
} satisfies Meta<typeof FeedbackState>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 取得中。まだ何も言えない状態を示す。形が予測できる領域では `Skeleton` の方が合う。 */
export const Loading: Story = {
  args: {
    kind: FEEDBACK_STATE_KIND.LOADING,
    title: "読み込んでいます",
  },
};

/** 正常だが表示する対象が無い状態。**失敗ではない**ので、次に取れる行動を添える。 */
export const Empty: Story = {
  args: {
    kind: FEEDBACK_STATE_KIND.EMPTY,
    title: "表示する項目がありません",
    description: "条件を変えてもう一度試してください。",
  },
};

/** 失敗した状態。利用者が対処できる文言にする。 */
export const ErrorState: Story = {
  args: {
    kind: FEEDBACK_STATE_KIND.ERROR,
    title: "読み込みに失敗しました",
    description: "時間をおいてもう一度試してください。",
  },
};

/** 完了した状態。画面が空のまま終わると成否が伝わらない場面で使う。 */
export const Success: Story = {
  args: {
    kind: FEEDBACK_STATE_KIND.SUCCESS,
    title: "保存しました",
  },
};
