import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { SectionFailure } from "./section-failure";

const meta = {
  title: "Features/Home/SectionFailure",
  component: SectionFailure,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "1 つの節だけが落ちたときの表示です。再読み込みの操作は置きません。",
          "ここで取り直せるのはサーバ側の取得で、押せる操作を出すなら画面全体の再取得になります。",
        ].join(""),
      },
    },
  },
  args: {
    label: "売れ筋ランキング",
    message: "問題が発生しました。時間をおいて再試行してください。",
  },
} satisfies Meta<typeof SectionFailure>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 1 つの節が落ちた状態。 */
export const Default: Story = {};
