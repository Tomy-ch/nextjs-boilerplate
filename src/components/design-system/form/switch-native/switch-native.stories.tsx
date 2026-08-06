import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useId } from "react";

import { Label } from "../label/label";
import { SwitchNative } from "./switch-native";
import { SWITCH_SIZE, type SwitchSize } from "./switch-native.definition";

function LabelledSwitch({
  checked = false,
  disabled = false,
  size = SWITCH_SIZE.DEFAULT,
}: {
  checked?: boolean;
  disabled?: boolean;
  size?: SwitchSize;
}) {
  const switchId = useId();

  return (
    <div className="flex items-center gap-2">
      <SwitchNative
        defaultChecked={checked}
        disabled={disabled}
        id={switchId}
        name="notification"
        size={size}
      />
      <Label htmlFor={switchId}>通知を受け取る</Label>
    </div>
  );
}

const meta = {
  title: "Form/SwitchNative",
  component: SwitchNative,
  parameters: { layout: "centered" },
} satisfies Meta<typeof SwitchNative>;

export default meta;
type Story = StoryObj<typeof meta>;

/** SSR first の基本状態。 */
export const Default: Story = { render: () => <LabelledSwitch /> };

/** 初期状態が入りの場合。 */
export const Checked: Story = { render: () => <LabelledSwitch checked /> };

/** 操作を受け付けない状態。 */
export const Disabled: Story = { render: () => <LabelledSwitch checked disabled /> };

/** 表示サイズ。 */
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <LabelledSwitch checked size={SWITCH_SIZE.SMALL} />
      <LabelledSwitch checked size={SWITCH_SIZE.DEFAULT} />
    </div>
  ),
};

/** native form の一部として送信する場合。 */
export const InForm: Story = {
  render: () => (
    <form action="/settings" className="flex flex-col gap-3">
      <LabelledSwitch checked />
      <button className="text-sm underline" type="submit">
        保存
      </button>
    </form>
  ),
};
