import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import {
  COUPON_DISCOUNT_FLAT_INVALID_MESSAGE,
  COUPON_DISCOUNT_KIND_MISSING_MESSAGE,
  COUPON_DISCOUNT_MAX_AMOUNT_INVALID_MESSAGE,
  COUPON_DISCOUNT_RATE_OUT_OF_RANGE_MESSAGE,
  type CouponDiscountValues,
  EMPTY_COUPON_DISCOUNT_VALUES,
} from "../../../../coupon-discount";
import { CouponDiscountFields, type CouponDiscountFieldsProps } from "./coupon-discount-fields";

/**
 * 値を持つ側として、本物と同じく `useState` で包む。
 *
 * @param props - 欄の props。`values` は最初の値として使う
 */
function Holder(props: CouponDiscountFieldsProps) {
  const [values, setValues] = useState<CouponDiscountValues>(props.values);

  return <CouponDiscountFields {...props} onValuesChange={setValues} values={values} />;
}

const meta = {
  title: "Features/Admin/Campaigns/New/CouponDiscountFields",
  component: CouponDiscountFields,
  render: (args) => <Holder {...args} />,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "発行するクーポンの値引きです。**種別を選ぶまで額の欄を出しません**（定額はドル、定率は % で、",
          "打つものの桁が違うため）。上限額は定率のときだけ出ます。値は呼び出し元が持ちます。",
        ].join(""),
      },
    },
  },
  args: {
    values: EMPTY_COUPON_DISCOUNT_VALUES,
    onValuesChange: () => undefined,
    onLeave: () => undefined,
    messages: {},
  },
} satisfies Meta<typeof CouponDiscountFields>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 何も選んでいない状態。種別だけが並ぶ。 */
export const Default: Story = {};

/** 定額。額はドルで打つ。 */
export const Flat: Story = { args: { values: { kind: "flat", value: "5", maxAmount: "" } } };

/** 定率。上限額の欄が並ぶ。 */
export const Rate: Story = { args: { values: { kind: "rate", value: "15", maxAmount: "20" } } };

/** 定率（スマホ）。欄は縦に積まれる。 */
export const RateMobile: Story = {
  args: { values: { kind: "rate", value: "15", maxAmount: "20" } },
  globals: { viewport: { value: "mobile2", isRotated: false } },
};

/** 種別を選ばずに進もうとした状態。 */
export const KindMissing: Story = {
  args: { messages: { discountKind: COUPON_DISCOUNT_KIND_MISSING_MESSAGE } },
};

/** 定額の額が読めなかった状態。 */
export const InvalidFlat: Story = {
  args: {
    values: { kind: "flat", value: "5.005", maxAmount: "" },
    messages: { discountValue: COUPON_DISCOUNT_FLAT_INVALID_MESSAGE },
  },
};

/** 定率の率が範囲を外れ、上限額も読めなかった状態。 */
export const InvalidRate: Story = {
  args: {
    values: { kind: "rate", value: "150", maxAmount: "0" },
    messages: {
      discountValue: COUPON_DISCOUNT_RATE_OUT_OF_RANGE_MESSAGE,
      discountMaxAmount: COUPON_DISCOUNT_MAX_AMOUNT_INVALID_MESSAGE,
    },
  },
};
