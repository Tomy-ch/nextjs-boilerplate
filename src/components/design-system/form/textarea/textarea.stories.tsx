import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useId } from "react";

import { Textarea } from "./textarea";

function LabeledTextarea() {
  const textareaId = useId();

  return (
    <div className="grid gap-2">
      <label htmlFor={textareaId}>補足</label>
      <Textarea id={textareaId} name="note" rows={4} />
    </div>
  );
}

function InvalidTextarea() {
  const textareaId = useId();
  const errorId = `${textareaId}-error`;

  return (
    <div className="grid gap-2">
      <label htmlFor={textareaId}>補足</label>
      <Textarea
        aria-describedby={errorId}
        aria-invalid={true}
        defaultValue="詳細を入力してください。"
        id={textareaId}
        name="note"
        rows={4}
      />
      <p className="text-sm text-destructive" id={errorId}>
        100 文字以内で入力してください。
      </p>
    </div>
  );
}

const meta = {
  title: "Form/Textarea",
  component: Textarea,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className="w-80 max-w-[calc(100vw-2rem)]">
        <Story />
      </div>
    ),
  ],
  args: {
    "aria-label": "補足",
    placeholder: "補足を入力",
  },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 通常の複数行入力。 */
export const Default: Story = {};

/** 視覚的なラベルで入力項目の意味を伝える利用例。 */
export const WithLabel: Story = {
  render: () => <LabeledTextarea />,
};

/** 表示する行数を native 属性で指定する入力。 */
export const WithRows: Story = {
  args: {
    defaultValue: "追加の情報を入力します。",
    rows: 6,
  },
};

/** 操作を受け付けない状態。 */
export const Disabled: Story = {
  args: {
    disabled: true,
    value: "変更できません",
  },
};

/** 検証エラーを示す状態。エラー文は呼び出し側が関連付けて表示する。 */
export const Invalid: Story = {
  render: () => <InvalidTextarea />,
};
