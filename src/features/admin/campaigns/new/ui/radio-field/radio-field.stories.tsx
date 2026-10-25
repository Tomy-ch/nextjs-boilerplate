import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { AdminRadioField, type AdminRadioFieldProps } from "./radio-field";

/**
 * 値を持つ側として、本物と同じく `useState` で包む。
 *
 * @param props - 欄の props。`value` は最初の値として使う
 */
function Holder(props: AdminRadioFieldProps<string>) {
  const [value, setValue] = useState(props.value);

  return <AdminRadioField {...props} onValueChange={setValue} value={value} />;
}

const meta = {
  title: "Features/Admin/Campaigns/New/RadioField",
  component: AdminRadioField,
  render: (args) => <Holder {...args} />,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "少数の選択肢から 1 つを選ぶ項目です。**既定の選択を置きません**",
          "（確かめずに送った値と意図して選んだ値を区別するため）。誤りは選択肢の群に結び付けます。",
        ].join(""),
      },
    },
  },
  args: {
    legend: "種類",
    name: "kind",
    options: [
      { value: "first", label: "ひとつめ" },
      { value: "second", label: "ふたつめ" },
    ],
    value: "",
    onValueChange: () => undefined,
    required: true,
  },
} satisfies Meta<typeof AdminRadioField<string>>;

export default meta;
type Story = StoryObj<typeof meta>;

/** まだ選んでいない状態。 */
export const Default: Story = {};

/** 選んだ状態。 */
export const Selected: Story = { args: { value: "second" } };

/** 選ばずに進もうとした状態。群の下に指摘が出る。 */
export const Invalid: Story = { args: { message: "種類を選んでください。" } };
