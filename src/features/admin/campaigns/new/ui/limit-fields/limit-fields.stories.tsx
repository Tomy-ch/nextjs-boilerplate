import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useCallback, useState } from "react";

import { COUPON_MIN_PURCHASE_INVALID_MESSAGE } from "../../../../coupon-discount";
import { FILLED_OWN_VALUES } from "../../campaign-new.fixture";
import {
  CAMPAIGN_LIMIT_INVALID_MESSAGE,
  CAMPAIGN_PER_USER_OVER_TOTAL_MESSAGE,
} from "../../campaign-rules";
import {
  type CampaignLimitField,
  CampaignLimitFields,
  type CampaignLimitFieldsProps,
} from "./limit-fields";

const EMPTY = { totalLimit: "", perUserLimit: "", minPurchaseAmount: "" };

/**
 * 値を持つ側として、本物と同じく `useState` で包む。
 *
 * @param props - 欄の props。`values` は最初の値として使う
 */
function Holder(props: CampaignLimitFieldsProps) {
  const [values, setValues] = useState(props.values);
  const change = useCallback(
    (field: CampaignLimitField, value: string) =>
      setValues((current) => ({ ...current, [field]: value })),
    [],
  );

  return <CampaignLimitFields {...props} onValueChange={change} values={values} />;
}

const meta = {
  title: "Features/Admin/Campaigns/New/LimitFields",
  component: CampaignLimitFields,
  render: (args) => <Holder {...args} />,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "配れる枚数と、配るクーポンを使うのに要る購入額です。最低購入額はドルで受け、任意です。",
      },
    },
  },
  args: { values: EMPTY, onValueChange: () => undefined, onLeave: () => undefined, messages: {} },
} satisfies Meta<typeof CampaignLimitFields>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 何も打っていない状態。 */
export const Default: Story = {};

/** 打ち終えた状態。 */
export const Filled: Story = { args: { values: FILLED_OWN_VALUES } };

/** 狭い幅。欄は縦に積まれる。 */
export const FilledMobile: Story = {
  args: { values: FILLED_OWN_VALUES },
  globals: { viewport: { value: "mobile2", isRotated: false } },
};

/** 1 人あたりが総枚数を超え、最低購入額も読めなかった状態。 */
export const Invalid: Story = {
  args: {
    values: { totalLimit: "0", perUserLimit: "5", minPurchaseAmount: "0.001" },
    messages: {
      totalLimit: CAMPAIGN_LIMIT_INVALID_MESSAGE,
      perUserLimit: CAMPAIGN_PER_USER_OVER_TOTAL_MESSAGE,
      minPurchaseAmount: COUPON_MIN_PURCHASE_INVALID_MESSAGE,
    },
  },
};
