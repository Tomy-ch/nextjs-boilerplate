import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useId } from "react";

import { Label } from "../label/label";
import { CheckboxClient } from "./checkbox-client";

function LabeledCheckbox({
  checked = false,
  disabled = false,
  indeterminate = false,
  invalid = false,
}) {
  const checkboxId = useId();

  return (
    <div className="flex items-center gap-2">
      <CheckboxClient
        aria-invalid={invalid}
        checked={indeterminate ? "indeterminate" : undefined}
        defaultChecked={indeterminate ? undefined : checked}
        disabled={disabled}
        id={checkboxId}
      />
      <Label htmlFor={checkboxId}>設定を有効にする</Label>
    </div>
  );
}

const meta = {
  title: "Form/CheckboxClient",
  component: CheckboxClient,
  parameters: { layout: "centered" },
} satisfies Meta<typeof CheckboxClient>;

export default meta;
type Story = StoryObj<typeof meta>;

/** client island の基本状態。 */
export const Default: Story = { render: () => <LabeledCheckbox /> };

/** 初期状態が選択済みの場合。 */
export const Checked: Story = { render: () => <LabeledCheckbox checked /> };

/** 配下の一部だけが選ばれている状態。checked とは別の印で示す。 */
export const Indeterminate: Story = { render: () => <LabeledCheckbox indeterminate /> };

/** 操作を受け付けない状態。 */
export const Disabled: Story = { render: () => <LabeledCheckbox disabled /> };

/** 検証エラーを示す状態。 */
export const Invalid: Story = { render: () => <LabeledCheckbox invalid /> };
