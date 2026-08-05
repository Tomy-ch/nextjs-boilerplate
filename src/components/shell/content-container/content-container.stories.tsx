import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ContentContainer } from "./content-container";

const meta = {
  title: "Layout/ContentContainer",
  component: ContentContainer,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ContentContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

function Paragraphs() {
  return (
    <div className="grid gap-4 py-6">
      <p>
        この枠は読み幅と左右余白だけを持ちます。縦方向の間隔や段組みは、中身を組む側が決めます。
      </p>
      <p>
        画面が読み幅より広い場合は中央へ寄り、左右に余白が残ります。狭い場合は左右の余白だけが
        残り、幅は画面に従います。
      </p>
    </div>
  );
}

/** 既定の構成。背景色は枠の範囲を見るための story 側の指定で、component は背景を持たない。 */
export const Default: Story = {
  render: () => (
    <div className="bg-muted">
      <ContentContainer className="bg-background">
        <Paragraphs />
      </ContentContainer>
    </div>
  ),
};

/** 読み幅より狭い viewport。中央寄せは効かず、左右余白だけが残る。 */
export const NarrowViewport: Story = {
  globals: { viewport: { value: "mobile1" } },
  render: () => (
    <div className="bg-muted">
      <ContentContainer className="bg-background">
        <Paragraphs />
      </ContentContainer>
    </div>
  ),
};
