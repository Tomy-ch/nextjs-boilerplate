import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { EMPTY_HISTORY, HISTORY, LONG_BODY_HISTORY } from "../../../inquiry.fixture";
import { InquiryConversation } from "./conversation";

const meta = {
  title: "Features/Inquiry/Thread/Conversation",
  component: InquiryConversation,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "やり取りの表示と送信です。受信の状態・やり取りの枠・送信欄を縦に並べ、与えられた高さを",
          "分け合います。やり取りだけが枠の中で流れ、送信欄は常に下端に残ります。",
          "**カタログは購読先を持ちません。** 発券の口が「対象なし」を返すため、受信の状態は待機のまま",
          "止まります（[msw のハンドラ](../../../.storybook/msw/handlers.ts)）。",
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
  args: { history: HISTORY },
} satisfies Meta<typeof InquiryConversation>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 日付をまたぐやり取り。 */
export const Default: Story = {};

/** まだ 1 通も無い状態。最初の 1 通を促す案内を出し、購読は始めない。 */
export const Empty: Story = { args: { history: EMPTY_HISTORY } };

/** 長い本文と、区切りの無い連続文字列。枠の中で流れ、送信欄は下端に残る。 */
export const LongBody: Story = { args: { history: LONG_BODY_HISTORY } };
