import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ADMIN_INQUIRY_LIST_PATH } from "../../../paths";
import { InquiryBreadcrumbTrail } from "./breadcrumb-trail";

const meta = {
  title: "Features/Admin/Inquiries/BreadcrumbTrail",
  component: InquiryBreadcrumbTrail,
  parameters: {
    layout: "padded",
    nextjs: { navigation: { pathname: ADMIN_INQUIRY_LIST_PATH } },
    docs: {
      description: {
        component:
          "問い合わせまわりの画面の、現在地までの階層です。受け取るのは一覧より下だけで、一覧へ戻る先頭の 1 段はどの画面でも同じなのでここが持ちます。",
      },
    },
  },
  args: { trail: ["対応"] },
} satisfies Meta<typeof InquiryBreadcrumbTrail>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 一覧のすぐ下。押せるのは先頭の 1 段だけ。 */
export const OneLevel: Story = {};
