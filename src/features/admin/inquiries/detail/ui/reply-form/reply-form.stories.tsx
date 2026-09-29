import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { failedActionState, idleActionState } from "@/model/action-state";

import { REPLY_BODY_FIELD } from "../../../form-names";
import { ADMIN_INQUIRY_ID } from "../../../inquiries.fixture";
import { AdminInquiryReplyForm } from "./reply-form";

const IDEMPOTENCY_KEY = "00000000-0000-4000-8000-000000000001";

const meta = {
  title: "Features/Admin/Inquiries/Detail/ReplyForm",
  component: AdminInquiryReplyForm,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "回答の入力欄です。書きかけはこの部品が持ち、**成立したときだけ片付けます**。",
          "`⌘Enter` での送信は持ちません —— 運営の回答は書き上げてから送るもので、打ち終わりが",
          "そのまま送信になると書きかけが利用者へ届きます。",
        ].join(""),
      },
    },
  },
  args: {
    action: () => {},
    idempotencyKey: IDEMPOTENCY_KEY,
    inquiryId: ADMIN_INQUIRY_ID,
    pending: false,
    state: idleActionState(),
  },
} satisfies Meta<typeof AdminInquiryReplyForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** まだ何も打っていない状態。空のままでは送信できない。 */
export const Default: Story = {};

/** 送信中。二重に送れないよう操作を閉じる。 */
export const Pending: Story = { args: { pending: true } };

/** 本文が契約を通らなかった状態。項目に文言が付く。 */
export const Invalid: Story = {
  args: {
    state: failedActionState({
      fieldErrors: { [REPLY_BODY_FIELD]: ["回答を入力してください。"] },
    }),
  },
};
