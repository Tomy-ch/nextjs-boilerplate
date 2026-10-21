import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { LoadingAnnouncement, LoadingAnnouncerProvider } from "./loading-announcer";

const meta = {
  title: "Feedback/LoadingAnnouncer",
  component: LoadingAnnouncerProvider,
  parameters: {
    docs: {
      description: {
        component: [
          "画面のどこかが読み込み中であることを、支援技術へ 1 件だけ告げる器です。",
          "**告げる領域は見えません。** この story の canvas は説明文だけで、確かめるのは",
          "accessibility tree の `status` の中身です。",
          "読み込み中として数えるのは、`Suspense` の待機表示の中に置いた `LoadingAnnouncement` です。",
        ].join(""),
      },
    },
  },
  args: { children: null },
} satisfies Meta<typeof LoadingAnnouncerProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 何も読み込んでいない。告げる領域は空のまま在る。 */
export const Default: Story = {
  args: {
    children: <p className="text-muted-foreground text-sm">読み込んでいる箇所はありません。</p>,
  },
};

/** 読み込み中。待ち時間を超えると `status` に「読み込んでいます」が入る。 */
export const Loading: Story = {
  args: {
    children: (
      <>
        <p className="text-muted-foreground text-sm">待機表示が 1 つ置かれています。</p>
        <LoadingAnnouncement />
      </>
    ),
  },
};
