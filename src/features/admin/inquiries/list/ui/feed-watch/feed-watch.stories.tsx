import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AdminInquiryFeedWatch } from "./feed-watch";

const meta = {
  title: "Features/Admin/Inquiries/List/FeedWatch",
  component: AdminInquiryFeedWatch,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "更新のあった問い合わせを拾い、一覧を取り直す購読です。見えるのは受信の状態だけで、",
          "届いた内容で一覧を書き換えることはしません。",
          "**カタログは購読先を持ちません。** 発券の口が「対象なし」を返すため、状態は待機のまま",
          "止まります（[msw のハンドラ](../../../../.storybook/msw/handlers.ts)）。",
        ].join(""),
      },
    },
  },
} satisfies Meta<typeof AdminInquiryFeedWatch>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 購読先が無く、待機のまま止まった状態。 */
export const Default: Story = {};
