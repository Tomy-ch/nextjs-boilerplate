import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useId } from "react";

import { Label } from "../../form/label/label";
import { ProgressNative } from "./progress-native";

function LabelledProgress() {
  const progressId = useId();

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={progressId}>アップロードの進捗</Label>
      <ProgressNative id={progressId} value={40} />
    </div>
  );
}

function ProgressWithValueText() {
  const progressId = useId();
  const value = 62;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <Label htmlFor={progressId}>アップロードの進捗</Label>
        <span className="text-muted-foreground text-sm">{value}%</span>
      </div>
      <ProgressNative id={progressId} value={value} />
    </div>
  );
}

function ProgressScale() {
  return (
    <div className="flex flex-col gap-4">
      <ProgressNative aria-label="細い進捗" className="h-1" value={40} />
      <ProgressNative aria-label="既定の進捗" value={40} />
      <ProgressNative aria-label="太い進捗" className="h-4" value={40} />
    </div>
  );
}

const meta = {
  title: "Status/ProgressNative",
  component: ProgressNative,
  parameters: { layout: "centered" },
  args: { "aria-label": "アップロードの進捗", value: 40 },
  decorators: [
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProgressNative>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定の `max` は `100`。名前は `aria-label` で与えている。 */
export const Default: Story = {};

/** 開始直後。値が `0` でも track は表示される。 */
export const Empty: Story = { args: { value: 0 } };

/** 完了時。`value` が `max` に達した状態。 */
export const Complete: Story = { args: { value: 100 } };

/** `max` を件数などの実単位にする場合。読み上げは百分率へ換算される。 */
export const CustomMax: Story = { args: { "aria-label": "処理済みの件数", max: 8, value: 3 } };

/** `label` 要素と関連付けてアクセシブルな名前を与える場合。 */
export const WithLabel: Story = { render: () => <LabelledProgress /> };

/** 数値を併記する場合。文言と桁の整形は呼び出し元が持つ。 */
export const WithValueText: Story = { render: () => <ProgressWithValueText /> };

/** 太さを `className` で上書きした場合。 */
export const Scale: Story = { render: () => <ProgressScale /> };
