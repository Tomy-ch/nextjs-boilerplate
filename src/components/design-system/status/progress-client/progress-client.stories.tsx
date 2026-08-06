import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useCallback, useId, useState } from "react";

import { Button } from "../../action/button/button";
import { ProgressClient } from "./progress-client";

function LabelledProgress() {
  const labelId = useId();

  return (
    <div className="flex flex-col gap-2">
      <span className="font-medium text-sm" id={labelId}>
        アップロードの進捗
      </span>
      <ProgressClient aria-labelledby={labelId} value={40} />
    </div>
  );
}

function AdvancingProgress() {
  const labelId = useId();
  const [value, setValue] = useState(20);
  const advance = useCallback(() => setValue((current) => Math.min(current + 20, 100)), []);
  const reset = useCallback(() => setValue(0), []);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="font-medium text-sm" id={labelId}>
          アップロードの進捗
        </span>
        <span className="text-muted-foreground text-sm">{value}%</span>
      </div>
      <ProgressClient aria-labelledby={labelId} value={value} />
      <div className="flex gap-2">
        <Button onClick={advance} size="sm">
          進める
        </Button>
        <Button onClick={reset} size="sm" variant="outline">
          戻す
        </Button>
      </div>
    </div>
  );
}

function ProgressScale() {
  return (
    <div className="flex flex-col gap-4">
      <ProgressClient aria-label="細い進捗" className="h-1" value={40} />
      <ProgressClient aria-label="既定の進捗" value={40} />
      <ProgressClient aria-label="太い進捗" className="h-4" value={40} />
    </div>
  );
}

const meta = {
  title: "Status/ProgressClient",
  component: ProgressClient,
  parameters: { layout: "centered" },
  args: { "aria-label": "アップロードの進捗", value: 40 },
  decorators: [
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProgressClient>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定の `max` は `100`。名前は `aria-label` で与えている。 */
export const Default: Story = {};

/** 開始直後。値が `0` でも track は表示される。 */
export const Empty: Story = { args: { value: 0 } };

/** 完了時。`value` が `max` に達した状態。 */
export const Complete: Story = { args: { value: 100 } };

/** `max` を件数などの実単位にする場合。進捗部分の幅は `value / max` の比で決まる。 */
export const CustomMax: Story = { args: { "aria-label": "処理済みの件数", max: 8, value: 3 } };

/** 値が更新される場合。幅の変化が補間される点が native 版との違い。 */
export const Advancing: Story = { render: () => <AdvancingProgress /> };

/** `aria-labelledby` で外の見出しをアクセシブルな名前にする場合。 */
export const WithLabel: Story = { render: () => <LabelledProgress /> };

/** 太さを `className` で上書きした場合。 */
export const Scale: Story = { render: () => <ProgressScale /> };
