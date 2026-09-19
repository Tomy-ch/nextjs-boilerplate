import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { toConversationDays } from "@/model/inquiry/conversation";

import { ADMIN_INQUIRY_HISTORY } from "../../../inquiries.fixture";
import { AdminInquiryMessageList } from "./message-list";

const meta = {
  title: "Features/Admin/Inquiries/Detail/MessageList",
  component: AdminInquiryMessageList,
  parameters: {
    docs: {
      description: {
        component: [
          "運営側から見たやり取りの並びです。取得も並べ替えも持たず、確定した並びを描くだけです。",
          "自分（運営）の発言を右、利用者を左に置くため、利用者側の画面とは向きが反転します。",
          "送信中の 1 通は確定したものと同じ向き・同じ面で末尾に置くため、届いた瞬間に行が",
          "入れ替わったようには見えません。",
        ].join(""),
      },
    },
  },
  args: { days: toConversationDays(ADMIN_INQUIRY_HISTORY.messages), pending: [] },
} satisfies Meta<typeof AdminInquiryMessageList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 日付をまたぐやり取り。 */
export const Default: Story = {};

/** 送信中の回答が末尾に並ぶ。 */
export const Sending: Story = {
  args: { pending: [{ id: "draft-1", body: "確認しております。" }] },
};
