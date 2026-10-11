import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import {
  COUPON_DISCOUNT_RATE_INVALID_MESSAGE,
  COUPON_VALIDITY_DAYS_INVALID_MESSAGE,
} from "../../coupon-rules";
import {
  DiscontinueConditionsFields,
  type DiscontinueConditionsFieldsProps,
  type DiscontinueConditionValues,
} from "./conditions-fields";

/**
 * 値を持つ側として、本物と同じく `useState` で包む。
 *
 * @param props - 欄の props。`values` は最初の値として使う
 */
function Holder(props: DiscontinueConditionsFieldsProps) {
  const [values, setValues] = useState<DiscontinueConditionValues>(props.values);

  return <DiscontinueConditionsFields {...props} onValuesChange={setValues} values={values} />;
}

const meta = {
  title: "Features/Admin/Products/Discontinue/ConditionsFields",
  component: DiscontinueConditionsFields,
  render: (args) => <Holder {...args} />,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "代替クーポンの条件です。**既定値を置きません**（何をどれだけ補償するかは業務の判断のため）。",
          "値引き率は百分率で受け、数値型の入力欄にしません。値は呼び出し元が持ちます。",
        ].join(""),
      },
    },
  },
  args: {
    values: { couponDiscountRate: "", couponValidityDays: "" },
    onValuesChange: () => undefined,
    messages: {},
  },
} satisfies Meta<typeof DiscontinueConditionsFields>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 何も打っていない状態。 */
export const Default: Story = {};

/** 狭い幅。2 つの欄が縦に積まれる。 */
export const Mobile: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
};

/** 打ち終えた状態。 */
export const Filled: Story = {
  args: { values: { couponDiscountRate: "12.5", couponValidityDays: "30" } },
};

/** 両方が読めなかった状態。欄ごとに、項目名を主語にした指摘が出る。 */
export const Invalid: Story = {
  args: {
    values: { couponDiscountRate: "10%", couponValidityDays: "0" },
    messages: {
      couponDiscountRate: COUPON_DISCOUNT_RATE_INVALID_MESSAGE,
      couponValidityDays: COUPON_VALIDITY_DAYS_INVALID_MESSAGE,
    },
  },
};
