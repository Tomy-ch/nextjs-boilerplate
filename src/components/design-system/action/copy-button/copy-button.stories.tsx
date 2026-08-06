import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { BUTTON_VARIANT } from "../button/button.definition";
import { CopyButton } from "./copy-button";

const meta = {
  title: "Action/CopyButton",
  component: CopyButton,
  parameters: { layout: "centered" },
  args: { label: "識別子を写す", value: "01JQZ8Y6K3M4N5P6Q7R8S9T0" },
} satisfies Meta<typeof CopyButton>;
export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。押すと印が check へ変わり、一定時間で戻る。 */
export const Default: Story = {};

/** 合図の文言を差し替えた場合。読み上げ専用の語なので画面には出ない。 */
export const CustomCopiedLabel: Story = {
  args: { copiedLabel: "コピー済み" },
};

/** 見た目を変えた場合。`Button` の props をそのまま受け取る。 */
export const Outline: Story = {
  args: { variant: BUTTON_VARIANT.OUTLINE },
};

/** 値の隣へ添えた場合。写る文字列は表示している文字列と同じものを渡す。 */
export const NextToValue: Story = {
  render: (args) => (
    <div className="flex items-center gap-2">
      <code className="rounded-md bg-muted px-2 py-1 text-sm">{args.value}</code>
      <CopyButton {...args} />
    </div>
  ),
};
