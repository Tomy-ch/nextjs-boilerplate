import type { ReactNode } from "react";

import { AppShell } from "@/components/shell/app-shell/app-shell";
import { CartHeaderAction } from "@/features/cart/ui/header-action/header-action";
import { CartPanel } from "@/features/cart/ui/panel/panel";

const SITE_NAME = "nextjs-boilerplate";

const NAV_ITEMS = [
  { href: "/products", label: "商品" },
  { href: "/purchases", label: "購入履歴" },
];

/**
 * 利用者向け画面の外枠。
 *
 * @remarks
 * shell を root layout ではなくこの route group に置くのは、admin 側が別の shell を持つ
 * ためです。root に置くと admin もこの header を経由することになり、切り替えの分岐を
 * shell の中に抱えます。root layout が持つのは `html` / `body` と Provider の mount だけです
 * （[0026](../../../docs/adr/0026-layout-shell-mount.md)）。
 *
 * カートを画面ごとではなくここへ置くのは、どの画面から追加しても同じ場所に出る必要があるためです。
 * 画面側に置くと、追加できる画面の数だけ mount が増えます。
 */
export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell
      siteName={SITE_NAME}
      navItems={NAV_ITEMS}
      headerActions={<CartHeaderAction />}
      sidebar={<CartPanel />}
      footer={<p>Next.js / React のプレゼンテーション層 boilerplate です。</p>}
    >
      {children}
    </AppShell>
  );
}
