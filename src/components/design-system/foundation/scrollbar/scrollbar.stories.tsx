import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ScrollArea } from "../../container/scroll-area/scroll-area";

const LINES = Array.from({ length: 24 }, (_, index) => `行 ${index + 1}`);

const meta = {
  title: "Foundation/Scrollbar",
  parameters: { layout: "centered" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** 局所スクロール領域。触れる前から scrollbar が出るため、別途スクロールすることが判る。 */
export const InScrollArea: Story = {
  render: () => (
    <ScrollArea aria-label="行の一覧" className="max-h-56 w-72 rounded-md border border-border p-3">
      <div className="flex flex-col gap-1">
        {LINES.map((line) => (
          <div className="text-sm" key={line}>
            {line}
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
};

/** 同じ見た目が native 要素にも及ぶ。基盤で一度宣言するだけで、指定は要らない。 */
export const InNativeElements: Story = {
  render: () => (
    <div className="flex w-72 flex-col gap-4">
      <textarea
        aria-label="複数行の入力"
        className="h-24 rounded-md border border-border p-2 text-sm"
        defaultValue={LINES.join("\n")}
      />
      <pre className="h-24 overflow-auto rounded-md border border-border p-2 text-xs">
        {LINES.map((line) => `${line}：この行は折り返さないため横にもスクロールする\n`).join("")}
      </pre>
    </div>
  ),
};

/** 横方向。thumb の大きさが残量を、位置が現在地を示す。 */
export const Horizontal: Story = {
  render: () => (
    <ScrollArea
      aria-label="横に並ぶ項目"
      className="max-w-72 rounded-md border border-border p-3"
      orientation="horizontal"
    >
      <div className="flex w-max gap-2">
        {LINES.map((line) => (
          <div className="rounded-md border border-border px-3 py-2 text-sm" key={line}>
            {line}
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
};
