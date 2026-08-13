import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { PullToRefresh } from "./pull-to-refresh";

const meta = {
  title: "Feedback/PullToRefresh",
  component: PullToRefresh,
  parameters: {
    layout: "fullscreen",
    docs: {
      story: { inline: false, iframeHeight: 360 },
      description: {
        component: [
          "画面の上端から引き下げて、いまの route を取り直す器です。",
          "**touch を持たない環境では何も描きません。** canvas がマウス操作の場合、この story は空に見えます。",
          "実機か、DevTools の device emulation で確認してください。",
          "ブラウザ既定の引き下げ更新は、この部品が載っている間だけ止まります。",
        ].join(""),
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="min-h-[600px] bg-muted/30 p-6">
        <p className="text-muted-foreground text-sm">
          上端から引き下げると目印が現れ、一定量を超えて離すと取り直しが走ります。
        </p>
        {Story()}
      </div>
    ),
  ],
} satisfies Meta<typeof PullToRefresh>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。touch のある環境でのみ目印が現れる。 */
export const Default: Story = {};
