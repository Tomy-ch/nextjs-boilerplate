import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ConsentBanner } from "./consent-banner";

const meta = {
  title: "Overlay/ConsentBanner",
  component: ConsentBanner,
  parameters: {
    layout: "fullscreen",
    // 面が focus を閉じ込めるため、Docs ページの中へ展開すると資料そのものを操作できなくなる。
    docs: { story: { inline: false, iframeHeight: 420 } },
    description: {
      component: [
        "任意の用途に cookie を使ってよいかを、選び終えるまで尋ね続ける面です。",
        "選ぶまで閉じません —— Escape も面の外を押す操作も受け付けず、閉じる操作は 2 つの選択肢だけです。",
        "**同意状態は持ちません。** いま尋ねているかは `open` で渡され、選ばれた意思は `onDecide` で返ります。",
        "似た形の `Dialog` は利用者が開いて閉じる面で、閉じる手段と履歴の戻りを持ちます。",
        "こちらは利用者が開いたものではないため、どちらも持ちません。",
      ].join(""),
    },
  },
  args: {
    open: true,
    onDecide: () => undefined,
  },
  decorators: [
    (Story) => (
      <div className="min-h-[400px] bg-muted/30 p-6">
        <p className="text-muted-foreground text-sm">
          背面の本文です。選び終えるまで、ここへは focus も読み上げも届きません。
        </p>
        {Story()}
      </div>
    ),
  ],
} satisfies Meta<typeof ConsentBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。判断の材料を示す文書への導線を添える。 */
export const Default: Story = {
  args: { policyHref: "/privacy" },
};

/** 示す文書が無い場合。導線そのものを出さず、文言だけで尋ねる。 */
export const WithoutPolicyLink: Story = {};
