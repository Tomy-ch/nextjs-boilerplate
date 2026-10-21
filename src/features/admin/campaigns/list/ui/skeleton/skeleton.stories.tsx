import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AdminCampaignListSkeleton } from "./skeleton";

const meta = {
  title: "Features/Admin/Campaigns/List/Skeleton",
  component: AdminCampaignListSkeleton,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "キャンペーン一覧の待機表示です。列見出しと行を同じ高さの枠で出すため、",
          "取得が終わった瞬間に下のページ送りの位置が動きません。",
          "行の数は実際の応答と一致せず、表の形が伝わる以上の意味を持ちません。",
        ].join(""),
      },
    },
  },
} satisfies Meta<typeof AdminCampaignListSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。列見出しの枠と 6 行分の枠が積まれる。 */
export const Default: Story = {};

/** スマホ。枠は幅いっぱいに伸び、高さは広い段と変わらない。 */
export const Mobile: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
};
