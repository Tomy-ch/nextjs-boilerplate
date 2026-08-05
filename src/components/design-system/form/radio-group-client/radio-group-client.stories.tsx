import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useId } from "react";

import { Label } from "../label/label";
import { RadioGroupClient, RadioGroupClientItem } from "./radio-group-client";

function ClientGroup({ disabled = false }) {
  const compactId = useId();
  const labelId = useId();
  const standardId = useId();

  return (
    <div className="grid gap-3">
      <p className="text-sm font-medium" id={labelId}>
        表示形式
      </p>
      <RadioGroupClient aria-labelledby={labelId} defaultValue="standard" disabled={disabled}>
        <Label htmlFor={compactId}>
          <RadioGroupClientItem id={compactId} value="compact" />
          簡潔
        </Label>
        <Label htmlFor={standardId}>
          <RadioGroupClientItem id={standardId} value="standard" />
          標準
        </Label>
      </RadioGroupClient>
    </div>
  );
}

const meta = {
  title: "Form/RadioGroupClient",
  component: RadioGroupClient,
  parameters: { layout: "centered" },
} satisfies Meta<typeof RadioGroupClient>;

export default meta;
type Story = StoryObj<typeof meta>;

/** `RadioGroupNative` と同じ選択肢・配置で比較する client island。 */
export const ClientOnly: Story = { render: () => <ClientGroup /> };

/** 同じ構成の操作不能状態。 */
export const Disabled: Story = { render: () => <ClientGroup disabled /> };
