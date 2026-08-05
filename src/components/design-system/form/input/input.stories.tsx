import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useId } from "react";

import { Input } from "./input";

function LabeledInput() {
  const inputId = useId();

  return (
    <div className="grid gap-2">
      <label htmlFor={inputId}>メールアドレス</label>
      <Input autoComplete="email" id={inputId} name="email" type="email" />
    </div>
  );
}

function InvalidInput() {
  const inputId = useId();
  const errorId = `${inputId}-error`;

  return (
    <div className="grid gap-2">
      <label htmlFor={inputId}>メールアドレス</label>
      <Input
        aria-describedby={errorId}
        aria-invalid={true}
        defaultValue="invalid-email"
        id={inputId}
        name="email"
        type="email"
      />
      <p className="text-sm text-destructive" id={errorId}>
        メールアドレスの形式で入力してください。
      </p>
    </div>
  );
}

const meta = {
  title: "Form/Input",
  component: Input,
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
    "aria-label": "メールアドレス",
    placeholder: "user@example.com",
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 通常のテキスト入力。 */
export const Default: Story = {};

/** 視覚的なラベルで入力項目の意味を伝える利用例。 */
export const WithLabel: Story = {
  render: () => <LabeledInput />,
};

/** email 用の native keyboard・validation を使う入力。 */
export const Email: Story = {
  args: {
    autoComplete: "email",
    type: "email",
  },
};

/** 入力値を伏せて表示する入力。 */
export const Password: Story = {
  args: {
    "aria-label": "パスワード",
    autoComplete: "current-password",
    placeholder: "パスワードを入力",
    type: "password",
  },
};

/** ファイル選択時の native input 表現。 */
export const File: Story = {
  args: {
    "aria-label": "添付ファイル",
    accept: "image/png,image/jpeg",
    type: "file",
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
  render: () => <InvalidInput />,
};
