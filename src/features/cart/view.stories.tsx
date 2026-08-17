import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ReactElement } from "react";

import { AppShell } from "@/components/shell/app-shell/app-shell";
import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { useCartStore } from "@/stores/cart-store";

import { CART, CART_WITH_ISSUES, CART_WITHOUT_PURCHASABLE, EMPTY_CART } from "./cart.fixture";
import { CartHeaderAction } from "./ui/header-action/header-action";
import { CartView } from "./view";

const NAV_ITEMS = [
  { href: "/products", label: "商品" },
  { href: "/purchases", label: "購入履歴" },
  { href: "/mypage", label: "マイページ" },
];

/**
 * route と同じ器で包む。
 *
 * @remarks
 * `(shop)/layout.tsx` が置く shell と `page.tsx` が置く見出し・読み幅を再現します。
 *
 * **脇の領域は置きません。** この画面自身がカートの全画面表示であり、同じ中身を脇にも出すと
 * 実物には無い並びになります。header の点数だけは実物どおり出します。
 */
function withPageFrame(Story: () => ReactElement) {
  useCartStore.setState({ isOpen: false });

  return (
    <div className="flex min-h-screen flex-col">
      <AppShell
        footer={<p>Next.js / React のプレゼンテーション層 boilerplate です。</p>}
        headerActions={<CartHeaderAction cart={CART} />}
        navItems={NAV_ITEMS}
        siteName="nextjs-boilerplate"
      >
        <ContentContainer className="py-8">
          <PageHeader>
            <div>
              <PageHeaderTitle>カート</PageHeaderTitle>
              <PageHeaderDescription>
                買えない明細や値の変わった明細は、その行に理由を添えています。
              </PageHeaderDescription>
            </div>
          </PageHeader>
          <Story />
        </ContentContainer>
      </AppShell>
    </div>
  );
}

const meta = {
  title: "Page/Cart",
  component: CartView,
  parameters: {
    layout: "fullscreen",
    docs: {
      story: { inline: false, iframeHeight: 900 },
      description: {
        component: [
          "カートの全画面表示です。**認証を要しません** —— 脇に領域を出せない幅では、",
          "未ログインの利用者が中身を確かめられる唯一の経路になります。",
          "広い段では集計を右に貼り付け、明細が伸びても小計と先へ進む導線が画面の中に残るようにします。",
          "小計はバックエンドが返す参考値で、**買える明細だけの合算**です。",
        ].join(""),
      },
    },
  },
  decorators: [withPageFrame],
} satisfies Meta<typeof CartView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** PC。明細と集計が横に並ぶ。 */
export const PC: Story = {
  args: { cart: CART },
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** タブレット。集計は明細の下へ回る。 */
export const Tablet: Story = {
  args: { cart: CART },
  globals: { viewport: { value: "tablet", isRotated: false } },
};

/** スマホ。行の中で操作が名前の下へ折り返す。 */
export const Mobile: Story = {
  args: { cart: CART },
  globals: { viewport: { value: "mobile2", isRotated: false } },
};

/** 買えない明細と値の変わった明細が混ざった状態。事情は行の中に出る。 */
export const WithIssues: Story = {
  args: { cart: CART_WITH_ISSUES },
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** 買える明細が 1 つも無い状態。購入手続きへ進む操作を押せなくする。 */
export const WithoutPurchasable: Story = {
  args: { cart: CART_WITHOUT_PURCHASABLE },
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** 空の状態。商品を探しに戻る導線だけを置く。 */
export const Empty: Story = {
  args: { cart: EMPTY_CART },
  globals: { viewport: { value: "desktop", isRotated: false } },
};
