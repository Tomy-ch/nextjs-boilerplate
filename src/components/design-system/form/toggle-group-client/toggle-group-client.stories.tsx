import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useCallback, useState } from "react";

import { ToggleGroupClient, ToggleGroupClientItem } from "./toggle-group-client";

function MultipleToggleGroup() {
  const [value, setValue] = useState<string[]>(["price"]);
  const handleChange = useCallback((next: string[]) => setValue(next), []);

  return (
    <div className="flex flex-col items-start gap-2">
      <ToggleGroupClient
        aria-label="表示する列"
        onValueChange={handleChange}
        type="multiple"
        value={value}
        variant="outline"
      >
        <ToggleGroupClientItem value="price">価格</ToggleGroupClientItem>
        <ToggleGroupClientItem value="archived">アーカイブ</ToggleGroupClientItem>
        <ToggleGroupClientItem value="updatedAt">更新日</ToggleGroupClientItem>
      </ToggleGroupClient>
      <p className="text-muted-foreground text-sm">選択中: {value.join(", ") || "（なし）"}</p>
    </div>
  );
}

const meta = {
  title: "Form/ToggleGroupClient",
  component: ToggleGroupClient,
  parameters: { layout: "centered" },
  args: { "aria-label": "ランキング期間", type: "single" },
} satisfies Meta<typeof ToggleGroupClient>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 排他選択。`radiogroup` と `radio` の意味論になる。 */
export const Single: Story = {
  render: () => (
    <ToggleGroupClient aria-label="ランキング期間" defaultValue="daily" type="single">
      <ToggleGroupClientItem value="daily">日次</ToggleGroupClientItem>
      <ToggleGroupClientItem value="weekly">週次</ToggleGroupClientItem>
      <ToggleGroupClientItem value="monthly">月次</ToggleGroupClientItem>
    </ToggleGroupClient>
  ),
};

/** 複数選択。`toolbar` と `aria-pressed` の意味論になり、選択中の値を配列で受け取る。 */
export const Multiple: Story = { render: () => <MultipleToggleGroup /> };

/** 枠線のある `outline` variant。`spacing` が `0` なので両端だけが丸い。 */
export const Outline: Story = {
  render: () => (
    <ToggleGroupClient
      aria-label="ランキング期間"
      defaultValue="daily"
      type="single"
      variant="outline"
    >
      <ToggleGroupClientItem value="daily">日次</ToggleGroupClientItem>
      <ToggleGroupClientItem value="weekly">週次</ToggleGroupClientItem>
    </ToggleGroupClient>
  ),
};

/** `spacing` を空けて、独立したボタンの並びに見せる場合。 */
export const Spaced: Story = {
  render: () => (
    <ToggleGroupClient
      aria-label="ランキング期間"
      defaultValue="daily"
      spacing={2}
      type="single"
      variant="outline"
    >
      <ToggleGroupClientItem value="daily">日次</ToggleGroupClientItem>
      <ToggleGroupClientItem value="weekly">週次</ToggleGroupClientItem>
    </ToggleGroupClient>
  ),
};

/** 大きさの 3 段階。枠線のある variant で境界を見せる。 */
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      {(["sm", "default", "lg"] as const).map((size) => (
        <ToggleGroupClient
          aria-label={`ランキング期間（${size}）`}
          defaultValue="daily"
          key={size}
          size={size}
          type="single"
          variant="outline"
        >
          <ToggleGroupClientItem value="daily">日次</ToggleGroupClientItem>
          <ToggleGroupClientItem value="weekly">週次</ToggleGroupClientItem>
        </ToggleGroupClient>
      ))}
    </div>
  ),
};

/** 選べない項目を含む場合。 */
export const WithDisabledItem: Story = {
  render: () => (
    <ToggleGroupClient
      aria-label="ランキング期間"
      defaultValue="daily"
      type="single"
      variant="outline"
    >
      <ToggleGroupClientItem value="daily">日次</ToggleGroupClientItem>
      <ToggleGroupClientItem value="weekly">週次</ToggleGroupClientItem>
      <ToggleGroupClientItem disabled value="yearly">
        年次
      </ToggleGroupClientItem>
    </ToggleGroupClient>
  ),
};
