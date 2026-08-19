import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Skeleton } from "../../status/skeleton/skeleton";

const meta = {
  title: "Foundation/Shimmer",
  parameters: { layout: "centered" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** 面に付けた場合。帯が面より狭いため、明滅ではなく流れているように見える。 */
export const OnSurface: Story = {
  render: () => (
    <div className="flex w-72 flex-col gap-3">
      <div className="shimmer h-16 rounded-md border border-border" />
      <div className="shimmer h-16 rounded-md bg-muted" />
    </div>
  ),
};

/** 文字に付けた場合。帯は文字の背後を通り、文字自体は読めるままにする。 */
export const OnText: Story = {
  render: () => (
    <p className="shimmer w-72 text-sm">見積書_2026年度_第2四半期.pdf を処理しています</p>
  ),
};

/**
 * Skeleton との違い。pulse は「ここに箱がある」ことを、shimmer は「止まっていない」ことを示す。
 * 置き換えではないため、長い処理では両方を使う。ただし同じ要素には付けられないので、Skeleton の
 * 子として重ねる。
 */
export const WithSkeleton: Story = {
  render: () => (
    <div className="flex w-72 flex-col gap-4">
      <section className="flex flex-col gap-2">
        <h3 className="font-emphasis text-sm">Skeleton だけ</h3>
        <Skeleton className="h-16 w-full" />
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="font-emphasis text-sm">shimmer を重ねる</h3>
        <Skeleton className="h-16 w-full">
          <div className="shimmer size-full rounded-md" />
        </Skeleton>
      </section>
    </div>
  ),
};

/**
 * 動きを止めたときの見た目。`prefers-reduced-motion` では帯ごと消えるため、これだけでは
 * 処理中が伝わらない。待機の文言を添えるのは呼び出し元の責務になる。
 */
export const ReducedMotion: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "OS の「視差効果を減らす」を有効にすると、この story の帯は消える。文言まで消えないよう、呼び出し元は待機の文言か Skeleton を併用する。",
      },
    },
  },
  render: () => (
    <div className="flex w-72 flex-col gap-2">
      <div className="shimmer h-16 rounded-md bg-muted" />
      <p className="text-muted-foreground text-sm">アップロードしています</p>
    </div>
  ),
};
