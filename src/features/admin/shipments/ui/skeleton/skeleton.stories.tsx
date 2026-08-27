import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ShipmentQueueSkeleton } from "./skeleton";

const meta = {
  title: "Features/Admin/Shipments/Skeleton",
  component: ShipmentQueueSkeleton,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "発送待ちの待機表示です。便の枠を出来上がりと同じ高さで縦に積むため、",
          "描画された瞬間に読み始めた位置が動きません。",
          "枠の中身は `Features/Admin/Shipments/DispatchGroupCard` が埋めますが、",
          "待機の側は便の件数も宛先も知らないので、組の数は形が伝わる数に留めてあります。",
        ].join(""),
      },
    },
  },
} satisfies Meta<typeof ShipmentQueueSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。3 組分の枠が縦に積まれる。 */
export const Default: Story = {};
