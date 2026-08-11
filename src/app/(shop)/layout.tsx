import type { ReactNode } from "react";

import { AppShell } from "@/components/shell/app-shell/app-shell";

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
 */
export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell
      siteName={SITE_NAME}
      navItems={NAV_ITEMS}
      footer={<p>Next.js / React のプレゼンテーション層 boilerplate です。</p>}
    >
      {children}
    </AppShell>
  );
}
