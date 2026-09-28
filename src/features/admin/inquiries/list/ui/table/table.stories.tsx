import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { CursorPagination } from "@/components/app-starter/cursor-pagination/cursor-pagination";

import { ADMIN_INQUIRY_ROWS } from "../../../inquiries.fixture";
import { toNextPageHref } from "../../../query";
import { AdminInquiryTable } from "./table";

const meta = {
  title: "Features/Admin/Inquiries/List/Table",
  component: AdminInquiryTable,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "問い合わせの一覧です。**本文は出しません** —— 契約が一覧に本文を載せていません。",
          "行から開くのは利用者の識別子を押す形で、押せる範囲は行全体に広げてあります。",
          "狭い段では開始日時の列を伏せ、誰の問い合わせかといつ動いたかだけを残します。",
        ].join(""),
      },
    },
  },
  args: { items: ADMIN_INQUIRY_ROWS },
} satisfies Meta<typeof AdminInquiryTable>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 3 件が並ぶ。 */
export const Default: Story = {};

/** 続きがあり、下にページ送りを置く。 */
export const WithPagination: Story = {
  args: {
    pagination: (
      <CursorPagination
        aria-label="問い合わせ一覧のページ送り"
        nextHref={toNextPageHref({ cursor: null, trail: [] }, "next-cursor")}
      />
    ),
  },
};

/** まだ 1 件も届いていない。 */
export const Empty: Story = { args: { items: [] } };

/** スマホ幅。開始日時の列を伏せる。 */
export const Mobile: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
};
