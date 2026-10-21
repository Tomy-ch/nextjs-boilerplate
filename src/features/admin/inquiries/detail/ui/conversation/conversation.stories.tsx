import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { idleActionState } from "@/model/action-state";

import { ADMIN_INQUIRY_HISTORY, ADMIN_INQUIRY_ID } from "../../../inquiries.fixture";
import { AdminInquiryConversation } from "./conversation";

const meta = {
  title: "Features/Admin/Inquiries/Detail/Conversation",
  component: AdminInquiryConversation,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "運営から見たやり取りと、回答の送信です。受信の状態・やり取りの枠・回答欄を縦に並べ、",
          "与えられた高さを分け合います。**会話そのものは購読しません** —— 更新フィードが開いている",
          "1 件の更新を伝えたときに正本を取り直します。",
          "**カタログは購読先を持ちません**（[msw のハンドラ](../../../../.storybook/msw/handlers.ts)）。",
        ].join(""),
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="flex h-[640px] flex-col">
        <Story />
      </div>
    ),
  ],
  args: {
    history: ADMIN_INQUIRY_HISTORY,
    inquiryId: ADMIN_INQUIRY_ID,
    replyAction: async () => idleActionState<void, "body">(),
  },
} satisfies Meta<typeof AdminInquiryConversation>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 利用者と運営のやり取りが並ぶ。 */
export const Default: Story = {};
