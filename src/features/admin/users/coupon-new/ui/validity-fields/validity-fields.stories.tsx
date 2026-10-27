import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useCallback, useState } from "react";
import { COUPON_MIN_PURCHASE_INVALID_MESSAGE } from "../../../../coupon-discount";
import { FILLED_ISSUE_OWN_VALUES } from "../../coupon-new.fixture";
import type { IssueOwnField } from "../../form-state";
import {
  EMPTY_ISSUE_OWN_VALUES,
  ISSUE_EXPIRES_AT_MISSING_MESSAGE,
  ISSUE_USABLE_AFTER_EXPIRY_MESSAGE,
} from "../../issue-rules";
import { IssueValidityFields, type IssueValidityFieldsProps } from "./validity-fields";

function Holder(props: IssueValidityFieldsProps) {
  const [values, setValues] = useState(props.values);
  const change = useCallback(
    (field: IssueOwnField, value: string) =>
      setValues((current) => ({ ...current, [field]: value })),
    [],
  );

  return <IssueValidityFields {...props} onValueChange={change} values={values} />;
}

const meta = {
  title: "Features/Admin/Users/CouponNew/ValidityFields",
  component: IssueValidityFields,
  render: (args) => <Holder {...args} />,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "発行するクーポンの有効期限・利用開始・最低購入額です。日時はこの端末の時間帯で受け、送る前に瞬間へ確定させます。",
          "利用開始は任意で、空欄へ戻す操作を持ちます。",
        ].join(""),
      },
    },
  },
  args: {
    values: EMPTY_ISSUE_OWN_VALUES,
    onValueChange: () => undefined,
    onLeave: () => undefined,
    messages: {},
  },
} satisfies Meta<typeof IssueValidityFields>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 何も打っていない状態。 */
export const Default: Story = {};

/** 打ち終え、利用開始も決めた状態。空欄へ戻す操作が並ぶ。 */
export const Filled: Story = {
  args: { values: { ...FILLED_ISSUE_OWN_VALUES, usableFrom: "2026-11-01T00:00" } },
};

/** 狭い幅。欄は縦に積まれる。 */
export const FilledMobile: Story = {
  args: { values: { ...FILLED_ISSUE_OWN_VALUES, usableFrom: "2026-11-01T00:00" } },
  globals: { viewport: { value: "mobile2", isRotated: false } },
};

/** 誤りが出た状態。 */
export const Invalid: Story = {
  args: {
    values: { expiresAt: "", usableFrom: "2027-01-15T00:00", minPurchaseAmount: "0" },
    messages: {
      expiresAt: ISSUE_EXPIRES_AT_MISSING_MESSAGE,
      usableFrom: ISSUE_USABLE_AFTER_EXPIRY_MESSAGE,
      minPurchaseAmount: COUPON_MIN_PURCHASE_INVALID_MESSAGE,
    },
  },
};
