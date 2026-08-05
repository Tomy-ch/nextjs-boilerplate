import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Kbd, KbdGroup } from "./kbd";

const meta = {
  title: "Display/Kbd",
  component: Kbd,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Kbd>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 単一のキー。 */
export const Default: Story = { args: { children: "K" } };

/** 修飾キーとの組み合わせ。個々のキーを並べる。 */
export const Combination: Story = {
  render: () => (
    <KbdGroup>
      <Kbd>⌘</Kbd>
      <Kbd>K</Kbd>
    </KbdGroup>
  ),
};

/** 区切り記号を挟む場合。記号は子として置く。 */
export const WithSeparator: Story = {
  render: () => (
    <KbdGroup>
      <Kbd>Ctrl</Kbd>
      <span className="text-xs text-muted-foreground">+</span>
      <Kbd>Shift</Kbd>
      <span className="text-xs text-muted-foreground">+</span>
      <Kbd>P</Kbd>
    </KbdGroup>
  ),
};

/** 文中に置く場合。何が起きるかは隣接する文言が伝える。 */
export const InSentence: Story = {
  render: () => (
    <p className="text-sm">
      <KbdGroup>
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </KbdGroup>
      で検索を開きます。
    </p>
  ),
};

/** 連続して押すキーを並べる場合。組み合わせと区別して間隔を空ける。 */
export const Sequence: Story = {
  render: () => (
    <p className="flex items-center gap-2 text-sm">
      <Kbd>G</Kbd>
      <span className="text-xs text-muted-foreground">の次に</span>
      <Kbd>H</Kbd>
    </p>
  ),
};
