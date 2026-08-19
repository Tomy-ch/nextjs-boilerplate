import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useCallback, useId, useState } from "react";

import { SliderClient } from "./slider-client";

function RangeSlider() {
  const labelId = useId();
  const [range, setRange] = useState([20, 70]);
  const handleChange = useCallback((next: number[]) => setRange(next), []);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="font-emphasis text-sm" id={labelId}>
          価格帯
        </span>
        <span className="text-muted-foreground text-sm">
          {range[0]} – {range[1]}
        </span>
      </div>
      <SliderClient
        onValueChange={handleChange}
        thumbLabels={["下限価格", "上限価格"]}
        value={range}
      />
    </div>
  );
}

const meta = {
  title: "Form/SliderClient",
  component: SliderClient,
  parameters: { layout: "centered" },
  args: { defaultValue: [40], thumbLabels: ["上限価格"] },
  decorators: [
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SliderClient>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 単一 thumb。値が一つで足りる場合は `SliderNative` を優先する。 */
export const Default: Story = {};

/** 二つの thumb で下限と上限を指定する、この component 固有の用途。 */
export const Range: Story = {
  args: { defaultValue: [20, 70], thumbLabels: ["下限価格", "上限価格"] },
};

/** `step` を指定して離散値だけを選べるようにした場合。 */
export const Stepped: Story = {
  args: {
    defaultValue: [20, 70],
    max: 100,
    min: 0,
    step: 10,
    thumbLabels: ["下限価格", "上限価格"],
  },
};

/** 操作不能な状態。 */
export const Disabled: Story = { args: { disabled: true } };

/** 縦向き。高さは `className` で与える。 */
export const Vertical: Story = { args: { className: "h-44", orientation: "vertical" } };

/** 制御 component として値を保持し、選択中の範囲を併記する場合。 */
export const Controlled: Story = { render: () => <RangeSlider /> };
