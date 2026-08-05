import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Separator } from "./separator";

const meta = {
  title: "Display/Separator",
  component: Separator,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "近接する内容のまとまりを区切ります。**区切りが意味を持つかどうかで `decorative` を決めます。**",
          "見出しや余白で既にまとまりが分かるなら、線は飾りなので `decorative` を指定して",
          "読み上げ対象から外します。線が無いと境界が分からない場合だけ、意味論を持つ区切りとして",
          "そのまま置きます。**両方の場面で同じ見た目になる**ため、指定を忘れると読み上げだけが変わります。",
          "余白そのものは持たないので、間隔は呼び出し元が与えます。",
        ].join(""),
      },
    },
  },
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 縦に積んだ内容を切る場合。既定の向き。 */
export const Horizontal: Story = {
  render: () => (
    <div className="w-80 space-y-3">
      <p>概要</p>
      <Separator />
      <p>補足</p>
    </div>
  ),
};

/**
 * 横に並んだ内容を切る場合。高さは親の高さに従うため、`items-stretch` などで高さが決まる
 * 文脈に置く。
 */
export const Vertical: Story = {
  render: () => (
    <div className="flex h-8 items-center gap-3">
      <span>概要</span>
      <Separator orientation="vertical" />
      <span>補足</span>
    </div>
  ),
};
