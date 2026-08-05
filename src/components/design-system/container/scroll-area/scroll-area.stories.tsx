import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useId } from "react";

import { Separator } from "../../display/separator/separator";
import { ScrollArea } from "./scroll-area";

const ITEMS = Array.from({ length: 24 }, (_, index) => `項目 ${index + 1}`);

function ItemList() {
  return (
    <div className="flex flex-col">
      {ITEMS.map((item) => (
        <div key={item}>
          <div className="py-2 text-sm">{item}</div>
          <Separator decorative />
        </div>
      ))}
    </div>
  );
}

function LabelledScrollArea() {
  const headingId = useId();

  return (
    <div className="flex w-72 flex-col gap-2">
      <h2 className="font-medium text-sm" id={headingId}>
        明細
      </h2>
      <ScrollArea
        aria-labelledby={headingId}
        className="max-h-56 rounded-md border border-border p-3"
      >
        <ItemList />
      </ScrollArea>
    </div>
  );
}

const meta = {
  title: "Container/ScrollArea",
  component: ScrollArea,
  parameters: { layout: "centered" },
  args: {
    "aria-label": "明細",
    className: "max-h-56 w-72 rounded-md border border-border p-3",
    children: <ItemList />,
  },
} satisfies Meta<typeof ScrollArea>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 縦方向の局所スクロール。高さは `className` で与える。 */
export const Default: Story = {};

/** 横方向。内容が折り返さない場合に使う。 */
export const Horizontal: Story = {
  args: {
    className: "max-w-72 rounded-md border border-border p-3",
    orientation: "horizontal",
    children: (
      <div className="flex w-max gap-2">
        {ITEMS.map((item) => (
          <div className="rounded-md border border-border px-3 py-2 text-sm" key={item}>
            {item}
          </div>
        ))}
      </div>
    ),
  },
};

/** 縦横の両方向。 */
export const Both: Story = {
  args: {
    className: "max-h-56 max-w-72 rounded-md border border-border p-3",
    orientation: "both",
    children: (
      <div className="flex w-max flex-col gap-2">
        {ITEMS.map((item) => (
          <div className="whitespace-nowrap text-sm" key={item}>
            {item}：この行は折り返さないため横にもスクロールする
          </div>
        ))}
      </div>
    ),
  },
};

/** 内容が領域に収まる場合。scrollbar は出ないが、領域としての意味論は変わらない。 */
export const WithoutOverflow: Story = {
  args: { children: <div className="text-sm">収まる内容です。</div> },
};

/** 見出しを `aria-labelledby` でアクセシブルな名前にする場合。 */
export const WithHeading: Story = { render: () => <LabelledScrollArea /> };

/**
 * 内容が focus 可能な要素だけの場合。子を辿れば browser が自動でスクロールするため、領域自体の
 * tab stop を `tabIndex={-1}` で外す。
 */
export const FocusableContent: Story = {
  args: {
    "aria-label": "絞り込み条件",
    tabIndex: -1,
    children: (
      <div className="flex flex-col items-start gap-1">
        {ITEMS.map((item) => (
          <button className="py-1 text-sm underline" key={item} type="button">
            {item}
          </button>
        ))}
      </div>
    ),
  },
};
