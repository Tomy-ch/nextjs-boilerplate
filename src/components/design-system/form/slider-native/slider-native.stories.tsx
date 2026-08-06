import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useId } from "react";

import { Label } from "../label/label";
import { SliderNative } from "./slider-native";

function LabelledSlider() {
  const sliderId = useId();

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={sliderId}>上限価格</Label>
      <SliderNative defaultValue={40} id={sliderId} name="priceMax" />
    </div>
  );
}

function SliderInForm() {
  const sliderId = useId();

  return (
    <form action="/search" className="flex flex-col gap-2">
      <Label htmlFor={sliderId}>上限価格</Label>
      <SliderNative defaultValue={40} id={sliderId} max={100} min={0} name="priceMax" step={10} />
      <button className="self-start text-sm underline" type="submit">
        絞り込む
      </button>
    </form>
  );
}

const meta = {
  title: "Form/SliderNative",
  component: SliderNative,
  parameters: { layout: "centered" },
  args: { "aria-label": "上限価格", defaultValue: 40 },
  decorators: [
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SliderNative>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定の範囲は `0`–`100`。名前は `aria-label` で与えている。 */
export const Default: Story = {};

/** `step` を指定して離散値だけを選べるようにした場合。 */
export const Stepped: Story = { args: { max: 100, min: 0, step: 10 } };

/** 範囲を実単位にした場合。値そのものは画面へ出ないため、必要なら併記する。 */
export const CustomRange: Story = {
  args: { "aria-label": "表示件数", defaultValue: 20, max: 50, min: 10, step: 5 },
};

/** 操作不能な状態。 */
export const Disabled: Story = { args: { disabled: true } };

/** `label` 要素と関連付ける場合。`input` は labelable なので `htmlFor` が使える。 */
export const WithLabel: Story = { render: () => <LabelledSlider /> };

/** native form に載せる場合。送信に browser JavaScript を必要としない。 */
export const InForm: Story = { render: () => <SliderInForm /> };
