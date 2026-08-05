import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useId } from "react";

import { Label } from "../label/label";
import { SelectNative, SelectNativeOption } from "./select-native";

function DisplayModeSelect({ disabled = false, invalid = false }) {
  const selectId = useId();

  return (
    <div className="grid gap-2">
      <Label htmlFor={selectId}>表示形式</Label>
      <SelectNative
        aria-invalid={invalid}
        defaultValue="standard"
        disabled={disabled}
        id={selectId}
        name="display-mode"
      >
        <SelectNativeOption value="compact">簡潔</SelectNativeOption>
        <SelectNativeOption value="standard">標準</SelectNativeOption>
        <SelectNativeOption value="detailed">詳細</SelectNativeOption>
      </SelectNative>
    </div>
  );
}

const meta = {
  title: "Form/SelectNative",
  component: SelectNative,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className="w-80 max-w-[calc(100vw-2rem)]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SelectNative>;

export default meta;
type Story = StoryObj<typeof meta>;

/** SSR first の基本的な選択 UI。 */
export const Default: Story = { render: () => <DisplayModeSelect /> };

/** 操作を受け付けない状態。 */
export const Disabled: Story = { render: () => <DisplayModeSelect disabled /> };

/** 検証エラーを示す状態。 */
export const Invalid: Story = { render: () => <DisplayModeSelect invalid /> };
