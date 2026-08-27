import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ReactElement } from "react";

import { AppShell } from "@/components/shell/app-shell/app-shell";
import { ContentContainer } from "@/components/shell/content-container/content-container";
import { EMPTY_CART } from "@/features/cart/cart.fixture";
import { CartHeaderAction } from "@/features/cart/ui/header-action/header-action";
import { CartPanel } from "@/features/cart/ui/panel/panel";
import { useCartStore } from "@/stores/cart-store";

import {
  EMPTY_PURCHASE_HISTORY,
  EMPTY_PURCHASE_SUMMARY,
  PROFILE,
  PURCHASE_HISTORY,
  PURCHASE_SUMMARY,
} from "../account.fixture";
import { MypageView } from "./view";

const NAV_ITEMS = [
  { href: "/products", label: "商品" },
  { href: "/purchases", label: "購入履歴" },
  { href: "/mypage", label: "マイページ" },
];

/**
 * route と同じ器で包む。
 *
 * @remarks
 * `(shop)/layout.tsx` が置く shell と `page.tsx` が置く読み幅を再現し、画面がどう収まるかを
 * 取得なしで確かめられるようにします。カートは空にします。マイページはカートの状態に依存せず、
 * 脇に領域があるかどうかだけが本文の幅を変えるためです。
 */
function withPageFrame(Story: () => ReactElement) {
  useCartStore.setState({ isOpen: false });

  return (
    <div className="flex min-h-screen flex-col">
      <AppShell
        footer={<p>Next.js / React のプレゼンテーション層 boilerplate です。</p>}
        headerActions={<CartHeaderAction cart={EMPTY_CART} />}
        navItems={NAV_ITEMS}
        sidebar={<CartPanel cart={EMPTY_CART} />}
        siteName="nextjs-boilerplate"
      >
        <ContentContainer className="py-8">
          <Story />
        </ContentContainer>
      </AppShell>
    </div>
  );
}

const meta = {
  title: "Page/Account/Mypage",
  component: MypageView,
  parameters: {
    layout: "fullscreen",
    docs: {
      story: { inline: false, iframeHeight: 900 },
      description: {
        component: [
          "マイページです。読むための 2 枚を段に並べ、戻せない操作である退会だけを区切りの下へ落とします。",
          "**退会はカタログでは実行されません** —— 確認 dialog までが確かめられる範囲です。",
        ].join(""),
      },
    },
  },
  decorators: [withPageFrame],
} satisfies Meta<typeof MypageView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。PC 幅で 2 枚が横に並ぶ。 */
export const Default: Story = {
  args: { profile: PROFILE, purchases: PURCHASE_HISTORY, summary: PURCHASE_SUMMARY },
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** 購入がまだ無い場合。集計のカードは残し、表を案内へ置き換える。 */
export const NoPurchases: Story = {
  args: { profile: PROFILE, purchases: EMPTY_PURCHASE_HISTORY, summary: EMPTY_PURCHASE_SUMMARY },
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** タブレット幅。2 枚が縦に積まれる境界を見る。 */
export const Tablet: Story = {
  args: { profile: PROFILE, purchases: PURCHASE_HISTORY, summary: PURCHASE_SUMMARY },
  globals: { viewport: { value: "tablet", isRotated: false } },
};

/** スマホ幅。表が横スクロールへ移るか、住所が折り返して収まるかを見る。 */
export const Mobile: Story = {
  args: { profile: PROFILE, purchases: PURCHASE_HISTORY, summary: PURCHASE_SUMMARY },
  globals: { viewport: { value: "mobile2", isRotated: false } },
};
