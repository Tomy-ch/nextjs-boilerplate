import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useCallback, useState } from "react";

import { FILLED_OWN_VALUES } from "../../campaign-new.fixture";
import {
  CAMPAIGN_DATE_MISSING_MESSAGE,
  CAMPAIGN_ENDS_BEFORE_START_MESSAGE,
  CAMPAIGN_EXPIRES_BEFORE_END_MESSAGE,
  CAMPAIGN_USABLE_AFTER_EXPIRY_MESSAGE,
} from "../../campaign-rules";
import {
  type CampaignPeriodField,
  CampaignPeriodFields,
  type CampaignPeriodFieldsProps,
} from "./period-fields";

const EMPTY = { startsAt: "", endsAt: "", couponExpiresAt: "", usableFrom: "" };

/**
 * 値を持つ側として、本物と同じく `useState` で包む。
 *
 * @param props - 欄の props。`values` は最初の値として使う
 */
function Holder(props: CampaignPeriodFieldsProps) {
  const [values, setValues] = useState(props.values);
  const change = useCallback(
    (field: CampaignPeriodField, value: string) =>
      setValues((current) => ({ ...current, [field]: value })),
    [],
  );

  return <CampaignPeriodFields {...props} onValueChange={change} values={values} />;
}

const meta = {
  title: "Features/Admin/Campaigns/New/PeriodFields",
  component: CampaignPeriodFields,
  render: (args) => <Holder {...args} />,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "配布期間と、配るクーポンが使える期間です。日時はこの端末の時間帯で受け、送る前に瞬間へ確定させます。",
          "利用開始は任意で、空欄へ戻す操作を持ちます。",
        ].join(""),
      },
    },
  },
  args: { values: EMPTY, onValueChange: () => undefined, onLeave: () => undefined, messages: {} },
} satisfies Meta<typeof CampaignPeriodFields>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 何も打っていない状態。 */
export const Default: Story = {};

/** 打ち終え、利用開始も決めた状態。空欄へ戻す操作が並ぶ。 */
export const Filled: Story = {
  args: { values: { ...FILLED_OWN_VALUES, usableFrom: "2026-10-05T00:00" } },
};

/** 狭い幅。欄は縦に積まれる。 */
export const FilledMobile: Story = {
  args: { values: { ...FILLED_OWN_VALUES, usableFrom: "2026-10-05T00:00" } },
  globals: { viewport: { value: "mobile2", isRotated: false } },
};

/** 大小関係が崩れた状態。後ろに来るべき欄の側に指摘が出る。 */
export const Reversed: Story = {
  args: {
    values: {
      startsAt: "2026-10-01T00:00",
      endsAt: "2026-09-30T00:00",
      couponExpiresAt: "2026-09-01T00:00",
      usableFrom: "2026-12-01T00:00",
    },
    messages: {
      endsAt: CAMPAIGN_ENDS_BEFORE_START_MESSAGE,
      couponExpiresAt: CAMPAIGN_EXPIRES_BEFORE_END_MESSAGE,
      usableFrom: CAMPAIGN_USABLE_AFTER_EXPIRY_MESSAGE,
    },
  },
};

/** 必須の日時を打たずに進もうとした状態。 */
export const Missing: Story = {
  args: {
    messages: {
      startsAt: CAMPAIGN_DATE_MISSING_MESSAGE,
      endsAt: CAMPAIGN_DATE_MISSING_MESSAGE,
      couponExpiresAt: CAMPAIGN_DATE_MISSING_MESSAGE,
    },
  },
};
