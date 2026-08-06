import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useId } from "react";

import { Input } from "../input/input";
import { Label } from "./label";

function LabeledInput() {
  const inputId = useId();

  return (
    <div className="grid gap-2">
      <Label htmlFor={inputId}>表示名</Label>
      <Input id={inputId} name="display-name" />
    </div>
  );
}

function DisabledInput() {
  const inputId = useId();

  return (
    <div className="group grid gap-2" data-disabled="true">
      <Label htmlFor={inputId}>表示名</Label>
      <Input disabled id={inputId} name="display-name" value="変更できません" />
    </div>
  );
}

const meta = {
  title: "Form/Label",
  component: Label,
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
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 対応する form control の項目名を表す。 */
export const Default: Story = {
  render: () => <LabeledInput />,
};

/** 操作不能な control に連動する表示。 */
export const Disabled: Story = {
  render: () => <DisabledInput />,
};
