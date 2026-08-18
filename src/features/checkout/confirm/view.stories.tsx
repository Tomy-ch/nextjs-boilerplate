import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ReactElement } from "react";

import { AppShell } from "@/components/shell/app-shell/app-shell";
import { ContentContainer } from "@/components/shell/content-container/content-container";
import { CART } from "@/features/cart/cart.fixture";
import { CartHeaderAction } from "@/features/cart/ui/header-action/header-action";
import { CartPanel } from "@/features/cart/ui/panel/panel";
import { useCartStore } from "@/stores/cart-store";

import {
  BLOCKED_CART,
  EMPTY_CART,
  LONG_CART,
  ORDERABLE_CART,
  PARTIALLY_ORDERABLE_CART,
  PROFILE,
  SUBTOTAL_REFERENCE,
} from "../checkout.fixture";
import { CheckoutConfirmView } from "./view";

/** 画面が組み立てた鍵の代わり。カタログでは確定を実行しないため、値そのものに意味はない。 */
const IDEMPOTENCY_KEY = "0195f0c2-0000-7000-a000-000000000001";

const NAV_ITEMS = [
  { href: "/products", label: "商品" },
  { href: "/mypage", label: "マイページ" },
];

/**
 * route と同じ器で包む。
 *
 * @remarks
 * `(shop)/layout.tsx` が置く shell と `page.tsx` が置く読み幅を再現し、画面がどう収まるかを
 * 取得なしで確かめられるようにします。脇のカートは閉じた状態にします。開いたままだと本文の幅が
 * 変わり、この画面が確かめたい 2 列の収まりと重なります。
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
  title: "Page/Checkout/Confirm",
  component: CheckoutConfirmView,
  parameters: {
    layout: "fullscreen",
    docs: {
      story: { inline: false, iframeHeight: 900 },
      description: {
        component: [
          "購入確認です。届け先と内容を左に積み、集計と確定を右へ置きます。",
          "脇に置けない幅では、集計と確定が画面の下端に固定された帯へ移ります。",
          "**カタログでは購入は実行されません。**",
        ].join(""),
      },
    },
  },
  decorators: [withPageFrame],
} satisfies Meta<typeof CheckoutConfirmView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。PC 幅で内容と集計が横に並ぶ。 */
export const Default: Story = {
  args: {
    cart: ORDERABLE_CART,
    idempotencyKey: IDEMPOTENCY_KEY,
    profile: PROFILE,
    reference: SUBTOTAL_REFERENCE,
  },
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** タブレット幅。集計が下端の帯へ移る。 */
export const Tablet: Story = {
  args: Default.args,
  globals: { viewport: { value: "tablet", isRotated: false } },
};

/** スマホ幅。内容が縦に積まれ、確定は下端に残る。 */
export const Mobile: Story = {
  args: Default.args,
  globals: { viewport: { value: "mobile2", isRotated: false } },
};

/** 一部の明細が今回の購入から外れる状態。 */
export const WithExcludedLines: Story = {
  args: { ...Default.args, cart: PARTIALLY_ORDERABLE_CART },
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** 明細が多い状態。10 件までを出し、残りはその場で開く。 */
export const LongOrder: Story = {
  args: { ...Default.args, cart: LONG_CART },
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** 確定できる明細が 1 つも無い状態。確定を押せない。 */
export const Blocked: Story = {
  args: { ...Default.args, cart: BLOCKED_CART, reference: null },
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** カートが空の状態。確かめる内容が無いので、商品を探す導線だけを出す。 */
export const Empty: Story = {
  args: { ...Default.args, cart: EMPTY_CART, reference: null },
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** 参考換算額を引けなかった状態。円で見る操作が消え、確定は生きている。 */
export const WithoutReference: Story = {
  args: { ...Default.args, reference: null },
  globals: { viewport: { value: "desktop", isRotated: false } },
};
