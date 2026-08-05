import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ComponentProps } from "react";
import { fn } from "storybook/test";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./collapsible";

const meta = {
  title: "Container/Collapsible",
  component: Collapsible,
  argTypes: {
    onToggle: { control: false, name: "toggle" },
  },
  args: {
    onToggle: fn<NonNullable<ComponentProps<"details">["onToggle"]>>(),
  },
  parameters: {
    controls: { include: ["open"] },
    layout: "centered",
    docs: {
      description: {
        component: [
          "**一つ**の補助内容を、必要なときだけ開いて確認させます。開く対象が複数あり、",
          "それが集合として並ぶなら `Accordion` を使います。",
          "実装は native の `details` / `summary` で、hydration の前から開閉でき、",
          "ページ内検索も閉じた内容に届きます。",
          "**最初に見えている必要がある内容は入れません。** 折り畳んだ内容は読まれない前提で置きます。",
        ].join(""),
      },
    },
  },
} satisfies Meta<typeof Collapsible>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 閉じた状態。既定はこちらで、開くかどうかは利用者が決める。 */
export const Closed: Story = {
  args: { open: false },
  render: (args) => (
    <Collapsible {...args} className="w-96">
      <CollapsibleTrigger>補足情報を表示</CollapsibleTrigger>
      <CollapsibleContent>必要な場合だけ、ここに置いた補足内容を確認できます。</CollapsibleContent>
    </Collapsible>
  ),
};

/** 初期状態で開いておく場合。内容を見せた状態から畳ませたいときに使う。 */
export const Open: Story = {
  args: { open: true },
  render: (args) => (
    <Collapsible {...args} className="w-96">
      <CollapsibleTrigger>補足情報を表示</CollapsibleTrigger>
      <CollapsibleContent>初期状態で開いた内容を示す場合にも使えます。</CollapsibleContent>
    </Collapsible>
  ),
};
