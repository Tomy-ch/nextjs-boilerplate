import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "./hover-card";

function HoverCardExample({ open }: { open?: boolean }) {
  return (
    <HoverCard open={open}>
      <HoverCardTrigger asChild>
        <a href="https://github.com/">GitHub</a>
      </HoverCardTrigger>
      <HoverCardContent>
        <p className="font-medium">GitHub</p>
        <p className="mt-1 text-sm text-muted-foreground">
          公開されているプロジェクト情報を確認できます。
        </p>
      </HoverCardContent>
    </HoverCard>
  );
}

const meta = {
  title: "Overlay/HoverCard",
  component: HoverCard,
  parameters: {
    layout: "centered",
    docs: {
      story: { inline: false, iframeHeight: 420 },
      description: {
        component: [
          "trigger に hover するか keyboard focus を当てたとき、その近くへ短い補足を開きます。",
          "`Tooltip` との違いは中身の作りで、tooltip が 1 行の説明文だけを持つのに対し、",
          "こちらは見出し・画像・link を含む面を置けます。**開く条件は同じ hover と focus なので、",
          "touch では到達できません。** 操作や判断に要る情報はここだけに置かず、",
          "常時表示か明示的な導線を呼び出し元が別に用意します。",
        ].join(""),
      },
    },
  },
} satisfies Meta<typeof HoverCard>;
export default meta;
type Story = StoryObj<typeof meta>;

/** 既定の状態。trigger に hover するか focus を当てると開く。 */
export const Default: Story = {
  render: () => <HoverCardExample />,
};

/** 開いた状態。面の内容は呼び出し元が children で渡す。 */
export const Open: Story = {
  render: () => <HoverCardExample open />,
};
