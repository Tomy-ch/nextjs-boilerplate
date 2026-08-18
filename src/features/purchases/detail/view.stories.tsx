import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ReactElement } from "react";

import { AppShell } from "@/components/shell/app-shell/app-shell";
import { ContentContainer } from "@/components/shell/content-container/content-container";
import { CART } from "@/features/cart/cart.fixture";
import { CartHeaderAction } from "@/features/cart/ui/header-action/header-action";
import { CartPanel } from "@/features/cart/ui/panel/panel";
import { useCartStore } from "@/stores/cart-store";

import { PURCHASE_DETAIL, SINGLE_LINE_PURCHASE, TOTAL_REFERENCE } from "../purchases.fixture";
import { PurchaseDetailView } from "./view";

const NAV_ITEMS = [
  { href: "/products", label: "商品" },
  { href: "/purchases", label: "購入履歴" },
  { href: "/mypage", label: "マイページ" },
];

/**
 * route と同じ器で包む。
 *
 * @remarks
 * 見出しは置きません。この画面の見出しはパンくずの現在地（購入コード）が担い、`page.tsx` からも
 * `PageHeader` を出しません。
 */
function withPageFrame(Story: () => ReactElement) {
  useCartStore.setState({ isOpen: false });

  return (
    <div className="flex min-h-screen flex-col">
      <AppShell
        footer={<p>Next.js / React のプレゼンテーション層 boilerplate です。</p>}
        headerActions={<CartHeaderAction cart={CART} />}
        navItems={NAV_ITEMS}
        sidebar={<CartPanel cart={CART} />}
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
  title: "Page/Purchases/Detail",
  component: PurchaseDetailView,
  parameters: {
    layout: "fullscreen",
    docs: {
      story: { inline: false, iframeHeight: 900 },
      description: {
        component: [
          "購入 1 件の詳細です。控えと内訳を並べ、結合済みの明細をその下へ置きます。",
          "**金額はすべてバックエンドが決めた確定値**で、画面は足し直しません。",
        ].join(""),
      },
    },
  },
  decorators: [withPageFrame],
} satisfies Meta<typeof PurchaseDetailView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。PC 幅で控えと内訳が横に並ぶ。 */
export const Default: Story = {
  args: { purchase: PURCHASE_DETAIL, reference: TOTAL_REFERENCE },
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** タブレット幅。控えと内訳がまだ横に並ぶ。 */
export const Tablet: Story = {
  args: Default.args,
  globals: { viewport: { value: "tablet", isRotated: false } },
};

/** スマホ幅。控えと内訳が縦に積まれ、注文番号が折り返す。 */
export const Mobile: Story = {
  args: Default.args,
  globals: { viewport: { value: "mobile2", isRotated: false } },
};

/** 参考換算額を引けなかった状態。円で見る操作が消える。 */
export const WithoutReference: Story = {
  args: { purchase: PURCHASE_DETAIL, reference: null },
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** 明細が 1 行だけの購入。段の高さが揃わない見え方を確かめる。 */
export const SingleLine: Story = {
  args: { purchase: SINGLE_LINE_PURCHASE, reference: null },
  globals: { viewport: { value: "desktop", isRotated: false } },
};
