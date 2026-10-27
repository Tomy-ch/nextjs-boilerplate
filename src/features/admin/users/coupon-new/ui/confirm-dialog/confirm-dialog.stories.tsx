import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  FILLED_ISSUE_DISCOUNT_VALUES,
  FILLED_ISSUE_OWN_VALUES,
  FILLED_ISSUE_SCOPE_VALUES,
  ISSUE_CATEGORY_OPTIONS,
  ISSUE_RECIPIENT,
  LONG_NAME_RECIPIENT,
} from "../../coupon-new.fixture";
import { ISSUE_RESEND_CONFLICT_MESSAGE } from "../../form-state";
import { confirmationOf } from "../../issue-summary";
import { IssueConfirmDialog } from "./confirm-dialog";

const CONFIRMATION = confirmationOf(
  FILLED_ISSUE_OWN_VALUES,
  FILLED_ISSUE_DISCOUNT_VALUES,
  FILLED_ISSUE_SCOPE_VALUES,
  ISSUE_CATEGORY_OPTIONS[0]?.label ?? "",
);

const meta = {
  title: "Features/Admin/Users/CouponNew/ConfirmDialog",
  component: IssueConfirmDialog,
  parameters: {
    layout: "padded",
    docs: {
      story: { inline: false, iframeHeight: 720 },
      description: {
        component: [
          "クーポンを発行する前の確認です。**発行は取り消せない**ため、発行先の名前と発行する中身を",
          "復唱します。送信は dialog の中の form が担い、押した瞬間には閉じません。",
        ].join(""),
      },
    },
  },
  args: {
    open: true,
    onDismiss: () => undefined,
    formAction: () => undefined,
    recipient: ISSUE_RECIPIENT,
    confirmation: CONFIRMATION,
    idempotencyKey: "0195f0c2-0000-7000-a000-000000000003",
    failures: [],
  },
} satisfies Meta<typeof IssueConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 開いた状態。 */
export const Default: Story = {};

/** 狭い幅。復唱は語と値を縦に積む。 */
export const Mobile: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
};

/** 契約が許す最大長の姓名。見出しが折り返す。 */
export const LongName: Story = {
  args: { recipient: LONG_NAME_RECIPIENT },
};

/** 確認の中で失敗した状態。 */
export const Failed: Story = {
  args: { failures: [ISSUE_RESEND_CONFLICT_MESSAGE] },
};
