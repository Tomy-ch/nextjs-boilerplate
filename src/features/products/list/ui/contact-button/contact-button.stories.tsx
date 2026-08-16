import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ToastProvider } from "@/components/shell/toaster/toaster";

import { ProductContactButton } from "./contact-button";

const meta = {
  title: "Features/Products/List/ContactButton",
  component: ProductContactButton,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "在庫の無い商品について問い合わせる入口です。**押しても問い合わせは送られません** ——",
          "受け口はまだ無く、この操作が持っているのは入口の位置だけです。押すと通知で、受け口が",
          "できるまで待ってほしいことを伝えます。",
        ].join(""),
      },
    },
  },
  decorators: [(Story) => <ToastProvider>{Story()}</ToastProvider>],
} satisfies Meta<typeof ProductContactButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 押すと通知が出る。 */
export const Default: Story = {};
