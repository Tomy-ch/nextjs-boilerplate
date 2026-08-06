import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useId } from "react";

import { Label } from "../label/label";
import {
  SelectClient,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select-client";

function ClientSelect({ disabled = false, invalid = false, open = false }) {
  const triggerId = useId();

  return (
    <div className="grid gap-2">
      <Label htmlFor={triggerId}>表示形式</Label>
      <SelectClient defaultValue="standard" disabled={disabled} name="display-mode" open={open}>
        <SelectTrigger aria-invalid={invalid} id={triggerId}>
          <SelectValue placeholder="選択してください" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="compact">簡潔</SelectItem>
          <SelectItem value="standard">標準</SelectItem>
          <SelectItem value="detailed">詳細</SelectItem>
        </SelectContent>
      </SelectClient>
    </div>
  );
}

const meta = {
  title: "Form/SelectClient",
  component: SelectClient,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className="w-80 max-w-[calc(100vw-2rem)]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SelectClient>;

export default meta;
type Story = StoryObj<typeof meta>;

/** native select では満たせない操作要件のための client island。 */
export const ClientOnly: Story = { render: () => <ClientSelect /> };

/** 操作を受け付けない状態。 */
export const Disabled: Story = { render: () => <ClientSelect disabled /> };

/** 検証エラーを示す trigger の状態。 */
export const Invalid: Story = { render: () => <ClientSelect invalid /> };

/** trigger 幅と揃う候補一覧の配置を確認する。 */
export const Open: Story = { render: () => <ClientSelect open /> };
