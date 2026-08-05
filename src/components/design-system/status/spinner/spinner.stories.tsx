import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "../../action/button/button";
import { Spinner } from "./spinner";

const meta = {
  title: "Status/Spinner",
  component: Spinner,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定は装飾。周囲の文言が状態を伝える前提で使う。 */
export const Default: Story = { args: {} };

/** spinner 単体で状態を伝える場合。`label` が読み上げ対象になる。 */
export const Labelled: Story = { args: { className: "size-8", label: "読み込んでいます" } };

/** 大きさは `className` で調整する。 */
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Spinner className="size-4" />
      <Spinner className="size-6" />
      <Spinner className="size-8" />
    </div>
  ),
};

/** 色は指定しなければ `currentColor` を継承する。 */
export const InheritsColor: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Spinner />
        補助的な処理
      </span>
      <span className="flex items-center gap-2 text-destructive">
        <Spinner />
        再試行しています
      </span>
    </div>
  ),
};

/** 送信中の button に置く場合。状態は button の文言が伝える。 */
export const InButton: Story = {
  render: () => (
    <Button disabled>
      <Spinner />
      送信中
    </Button>
  ),
};
