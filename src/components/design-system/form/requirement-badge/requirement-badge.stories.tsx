import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { FieldLabel } from "../field/field";
import { RequirementBadge } from "./requirement-badge";

const meta = {
  title: "Form/RequirementBadge",
  component: RequirementBadge,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "入力項目が必須か任意かを示す印です。**視覚のためだけの印**で、読み上げからは外して",
          "あります。必須であることは control 側の `aria-required` が伝えます。",
        ].join(""),
      },
    },
  },
} satisfies Meta<typeof RequirementBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 必須の項目。 */
export const Required: Story = {
  args: { required: true },
};

/** 任意の項目。 */
export const Optional: Story = {
  args: { required: false },
};

/**
 * label と並べた状態。`label` の前に置くと、どちらの文言も 2 文字なので印の列と label の
 * 開始位置が同時に揃う。
 */
export const WithLabel: Story = {
  args: { required: true },
  render: () => (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <RequirementBadge required />
        <FieldLabel htmlFor="requirement-badge-example-name">姓</FieldLabel>
      </div>
      <div className="flex items-center gap-2">
        <RequirementBadge required />
        <FieldLabel htmlFor="requirement-badge-example-email">メールアドレス</FieldLabel>
      </div>
      <div className="flex items-center gap-2">
        <RequirementBadge required={false} />
        <FieldLabel htmlFor="requirement-badge-example-building">建物名・部屋番号</FieldLabel>
      </div>
    </div>
  ),
};
