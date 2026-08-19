import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { PrintButton } from "./print-button";

const meta = {
  title: "Action/PrintButton",
  component: PrintButton,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "表示中の文書を印刷する操作です。**何を紙へ出すかは持ちません。**",
          "紙に残すもの・落とすものは、各要素へ付けた `print-hidden` / `print-only` が決めます。",
          "この操作自身は紙へ出ません。",
        ].join(""),
      },
    },
  },
} satisfies Meta<typeof PrintButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。押すと browser の印刷を開く。 */
export const Default: Story = {};

/** 紙に出ない要素と並べた場合。canvas では差が見えないため、印刷プレビューで確かめる。 */
export const BesideContent: Story = {
  decorators: [
    (Story) => (
      <div className="flex w-80 items-center justify-between gap-4 rounded-lg border p-4">
        <p className="text-sm">この段落は紙にも出ます。</p>
        <Story />
      </div>
    ),
  ],
};
