import type { Meta, StoryObj } from "@storybook/nextjs-vite";

const meta = {
  title: "Foundation/ScrollFade",
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "横スクロールする領域の端をぼかし、続きがあることを示す。scrollbar を消した領域でだけ使う。",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const CARDS = Array.from({ length: 10 }, (_, index) => `項目 ${index + 1}`);

function Cards() {
  return (
    <>
      {CARDS.map((card) => (
        <div
          className="flex size-24 flex-none items-center justify-center rounded-md border border-border bg-muted text-sm"
          key={card}
        >
          {card}
        </div>
      ))}
    </>
  );
}

/**
 * scrollbar を消した横並び。端のぼかしだけが、続きがあることを示している。先頭では左端が
 * ぼけず、末尾まで送ると右端のぼかしが外れる。
 */
export const WithoutScrollbar: Story = {
  render: () => (
    <div className="flex w-80 scroll-fade-x gap-3 overflow-x-auto scrollbar-none py-1">
      <Cards />
    </div>
  ),
};

/**
 * scrollbar がある領域。存在も残量も現在地も scrollbar が示すため、ぼかしは足さない。
 */
export const WithScrollbar: Story = {
  render: () => (
    <div className="flex w-80 gap-3 overflow-x-auto py-1">
      <Cards />
    </div>
  ),
};

/**
 * 縦スクロール。scrollbar を消した縦並びでも、端のぼかしが続きを示す。上端では先頭に居ることが
 * 判り、末尾まで送ると下端のぼかしが外れる。
 */
export const VerticalWithoutScrollbar: Story = {
  render: () => (
    <div className="flex h-64 w-64 flex-col scroll-fade-y gap-3 overflow-y-auto scrollbar-none px-1">
      <Cards />
    </div>
  ),
};

/**
 * 縦スクロールで scrollbar がある場合。存在も残量も現在地も scrollbar が示すため、ぼかしは
 * 足さない。
 */
export const VerticalWithScrollbar: Story = {
  render: () => (
    <div className="flex h-64 w-64 flex-col gap-3 overflow-y-auto px-1">
      <Cards />
    </div>
  ),
};

/**
 * 収まりきる場合。スクロールが起きないので、ぼかしは端の飾りにしかならない。付ける対象は
 * 溢れうる領域に限る。
 */
export const NoOverflow: Story = {
  render: () => (
    <div className="flex w-80 scroll-fade-x gap-3 overflow-x-auto scrollbar-none py-1">
      <div className="flex size-24 flex-none items-center justify-center rounded-md border border-border bg-muted text-sm">
        項目 1
      </div>
    </div>
  ),
};
