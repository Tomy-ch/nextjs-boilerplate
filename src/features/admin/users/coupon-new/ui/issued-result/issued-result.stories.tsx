import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  FILLED_ISSUE_DISCOUNT_VALUES,
  FILLED_ISSUE_OWN_VALUES,
  FILLED_ISSUE_SCOPE_VALUES,
  ISSUE_CATEGORY_OPTIONS,
  ISSUE_RECIPIENT,
  LONG_NAME_RECIPIENT,
} from "../../coupon-new.fixture";
import { confirmationOf } from "../../issue-summary";
import { IssuedResult } from "./issued-result";

const SUMMARY = confirmationOf(
  FILLED_ISSUE_OWN_VALUES,
  FILLED_ISSUE_DISCOUNT_VALUES,
  FILLED_ISSUE_SCOPE_VALUES,
  ISSUE_CATEGORY_OPTIONS[0]?.label ?? "",
).summary;

const meta = {
  title: "Features/Admin/Users/CouponNew/IssuedResult",
  component: IssuedResult,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "発行が成立したことの報せです。確認が閉じた後も残り、発行した内容を復唱します。",
          "続けて発行する操作と、利用者一覧へ戻る行き先を並べます。",
        ].join(""),
      },
    },
  },
  args: {
    recipientName: ISSUE_RECIPIENT.name,
    summary: SUMMARY,
    onIssueAnother: () => undefined,
  },
} satisfies Meta<typeof IssuedResult>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。 */
export const Default: Story = {};

/** 狭い幅。 */
export const Mobile: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
};

/** 契約が許す最大長の姓名。 */
export const LongName: Story = {
  args: { recipientName: LONG_NAME_RECIPIENT.name },
};
