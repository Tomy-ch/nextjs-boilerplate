import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useId } from "react";

import { Button } from "../../action/button/button";
import { Input } from "../../form/input/input";
import { Label } from "../../form/label/label";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "./popover";

function LabelledPopover({
  align = "center",
  defaultOpen = false,
  side = "bottom",
}: {
  align?: "start" | "center" | "end";
  defaultOpen?: boolean;
  side?: "top" | "right" | "bottom" | "left";
}) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <Popover defaultOpen={defaultOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline">補足を開く</Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        side={side}
      >
        <PopoverHeader>
          <PopoverTitle id={titleId}>表示条件</PopoverTitle>
          <PopoverDescription id={descriptionId}>
            条件を満たす項目だけを一覧に表示します。条件は保存されません。
          </PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  );
}

function FilterPopover() {
  const keywordId = useId();

  return (
    <Popover defaultOpen>
      <PopoverTrigger asChild>
        <Button variant="outline">絞り込み</Button>
      </PopoverTrigger>
      <PopoverContent aria-label="絞り込み条件">
        <div className="flex flex-col gap-2">
          <Label htmlFor={keywordId}>キーワード</Label>
          <Input id={keywordId} name="keyword" placeholder="名称の一部" />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function AnchoredPopover() {
  return (
    <Popover defaultOpen>
      <PopoverAnchor asChild>
        <div className="flex w-72 items-center justify-between gap-2 rounded-md border border-border p-2">
          <span className="text-sm text-muted-foreground">2026-08-03</span>
          <PopoverTrigger asChild>
            <Button size="sm" variant="ghost">
              変更
            </Button>
          </PopoverTrigger>
        </div>
      </PopoverAnchor>
      <PopoverContent align="start" aria-label="日付の変更">
        <PopoverDescription>基準にする要素を trigger とは別に指定できます。</PopoverDescription>
      </PopoverContent>
    </Popover>
  );
}

const meta = {
  title: "Overlay/Popover",
  component: Popover,
  parameters: {
    docs: { story: { inline: false, iframeHeight: 420 } },
    layout: "centered",
  },
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

/** trigger を操作して開く基本構成。 */
export const Default: Story = { render: () => <LabelledPopover /> };

/** 開いた状態の見出し・説明の構成。 */
export const Open: Story = { render: () => <LabelledPopover defaultOpen /> };

/** trigger の上端へ左揃えで表示する場合。 */
export const Placement: Story = {
  render: () => <LabelledPopover align="start" defaultOpen side="top" />,
};

/** 補助操作を内容として置く場合。開閉のみを client に閉じ、入力は native form へ委ねる。 */
export const WithFormControls: Story = { render: () => <FilterPopover /> };

/** 開く操作と位置基準が異なる場合に `PopoverAnchor` で基準要素を指定する。 */
export const WithAnchor: Story = { render: () => <AnchoredPopover /> };
