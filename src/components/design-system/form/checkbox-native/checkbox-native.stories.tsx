import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useId } from "react";

import { Label } from "../label/label";
import { CheckboxNative } from "./checkbox-native";

function LabeledCheckbox({ checked = false, disabled = false, invalid = false }) {
  const checkboxId = useId();

  return (
    <div className="flex items-center gap-2">
      <CheckboxNative
        aria-invalid={invalid}
        defaultChecked={checked}
        disabled={disabled}
        id={checkboxId}
        name="enabled"
      />
      <Label htmlFor={checkboxId}>設定を有効にする</Label>
    </div>
  );
}

const meta = {
  title: "Form/CheckboxNative",
  component: CheckboxNative,
  parameters: { layout: "centered" },
} satisfies Meta<typeof CheckboxNative>;

export default meta;
type Story = StoryObj<typeof meta>;

/** SSR first の基本状態。 */
export const Default: Story = { render: () => <LabeledCheckbox /> };

/** 初期状態が選択済みの場合。 */
export const Checked: Story = { render: () => <LabeledCheckbox checked /> };

/** 操作を受け付けない状態。 */
export const Disabled: Story = { render: () => <LabeledCheckbox disabled /> };

/** 検証エラーを示す状態。 */
export const Invalid: Story = { render: () => <LabeledCheckbox invalid /> };
