import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ReactElement } from "react";

import { AppShell } from "@/components/shell/app-shell/app-shell";
import { ContentContainer } from "@/components/shell/content-container/content-container";
import { ToastProvider } from "@/components/shell/toaster/toaster";
import { CartHeaderAction } from "@/features/cart/ui/header-action/header-action";
import { CartPanel } from "@/features/cart/ui/panel/panel";
import { useCartStore } from "@/stores/cart-store";

import { PREFECTURES, PROFILE } from "../account.fixture";
import { ProfileEditView } from "./view";

const NAV_ITEMS = [
  { href: "/products", label: "商品" },
  { href: "/purchases", label: "購入履歴" },
  { href: "/mypage", label: "マイページ" },
];

/**
 * route と同じ器で包む。
 *
 * @remarks
 * カートはマイページの story と同じ理由で空にします。`ToastProvider` を置くのは、保存の成功を
 * 伝えるのが toast だからで、実物では root layout がこれを持ちます。
 */
function withPageFrame(Story: () => ReactElement) {
  useCartStore.setState({ lines: [], isOpen: false });

  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col">
        <AppShell
          footer={<p>Next.js / React のプレゼンテーション層 boilerplate です。</p>}
          headerActions={<CartHeaderAction />}
          navItems={NAV_ITEMS}
          sidebar={<CartPanel />}
          siteName="nextjs-boilerplate"
        >
          <ContentContainer className="py-8">
            <Story />
          </ContentContainer>
        </AppShell>
      </div>
    </ToastProvider>
  );
}

const meta = {
  title: "Page/Account/ProfileEdit",
  component: ProfileEditView,
  parameters: {
    layout: "fullscreen",
    docs: {
      story: { inline: false, iframeHeight: 1100 },
      description: {
        component: [
          "プロフィール編集です。マイページの下の階層にあるためパンくずを置きます。",
          "**保存はカタログでは動きません** —— 送信先は Server Action です。",
        ].join(""),
      },
    },
  },
  decorators: [withPageFrame],
} satisfies Meta<typeof ProfileEditView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。PC 幅で短い項目が横に並ぶ。 */
export const Default: Story = {
  args: { prefectures: PREFECTURES, profile: PROFILE },
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** タブレット幅。横並びの組が縦へ落ちる境界を見る。 */
export const Tablet: Story = {
  args: { prefectures: PREFECTURES, profile: PROFILE },
  globals: { viewport: { value: "tablet", isRotated: false } },
};

/** スマホ幅。すべての項目が 1 列になり、操作が下端に収まるかを見る。 */
export const Mobile: Story = {
  args: { prefectures: PREFECTURES, profile: PROFILE },
  globals: { viewport: { value: "mobile2", isRotated: false } },
};
