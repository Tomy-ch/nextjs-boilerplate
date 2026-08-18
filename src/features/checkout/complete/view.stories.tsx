import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ReactElement } from "react";

import { AppShell } from "@/components/shell/app-shell/app-shell";
import { ContentContainer } from "@/components/shell/content-container/content-container";
import { EMPTY_CART } from "@/features/cart/cart.fixture";
import { CartHeaderAction } from "@/features/cart/ui/header-action/header-action";
import { CartPanel } from "@/features/cart/ui/panel/panel";
import { useCartStore } from "@/stores/cart-store";

import { PURCHASE, TOTAL_REFERENCE } from "../checkout.fixture";
import { CheckoutCompleteView } from "./view";

const NAV_ITEMS = [
  { href: "/products", label: "商品" },
  { href: "/mypage", label: "マイページ" },
];

/**
 * route と同じ器で包む。
 *
 * @remarks
 * カートは空にします。購入した明細はこの画面に着く前に取り除かれており、空であることが
 * 成立後の状態だからです。
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
  title: "Page/Checkout/Complete",
  component: CheckoutCompleteView,
  parameters: {
    layout: "fullscreen",
    docs: {
      story: { inline: false, iframeHeight: 900 },
      description: {
        component: [
          "購入完了です。成立したことを先に伝え、控えと内訳、購入した明細を続けます。",
          "**確定の応答をそのまま描かず購入を取り直す**ので、再読み込みでも共有でも同じ内容が出ます。",
        ].join(""),
      },
    },
  },
  decorators: [withPageFrame],
} satisfies Meta<typeof CheckoutCompleteView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。PC 幅で控えと内訳が横に並ぶ。 */
export const Default: Story = {
  args: { purchase: PURCHASE, reference: TOTAL_REFERENCE },
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** スマホ幅。控えと内訳が縦に積まれる。 */
export const Mobile: Story = {
  args: Default.args,
  globals: { viewport: { value: "mobile2", isRotated: false } },
};

/** 参考換算額を引けなかった状態。円で見る操作が消える。 */
export const WithoutReference: Story = {
  args: { purchase: PURCHASE, reference: null },
  globals: { viewport: { value: "desktop", isRotated: false } },
};
