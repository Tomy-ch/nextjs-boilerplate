import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useId } from "react";

import { Label } from "../label/label";
import { RadioGroupNative, RadioGroupNativeItem } from "./radio-group-native";

function NativeGroup({ disabled = false }) {
  const compactId = useId();
  const standardId = useId();

  return (
    <RadioGroupNative>
      <legend>表示形式</legend>
      <Label htmlFor={compactId}>
        <RadioGroupNativeItem
          disabled={disabled}
          id={compactId}
          name="display-mode"
          value="compact"
        />
        簡潔
      </Label>
      <Label htmlFor={standardId}>
        <RadioGroupNativeItem
          defaultChecked
          disabled={disabled}
          id={standardId}
          name="display-mode"
          value="standard"
        />
        標準
      </Label>
    </RadioGroupNative>
  );
}

const meta = {
  title: "Form/RadioGroupNative",
  component: RadioGroupNative,
  parameters: { layout: "centered" },
} satisfies Meta<typeof RadioGroupNative>;

export default meta;
type Story = StoryObj<typeof meta>;

/** `RadioGroupClient` と同じ選択肢・配置で比較する SSR first の基本形。 */
export const Default: Story = { render: () => <NativeGroup /> };

/** 同じ構成の操作不能状態。 */
export const Disabled: Story = { render: () => <NativeGroup disabled /> };
