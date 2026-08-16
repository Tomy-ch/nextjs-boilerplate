import type { ReactNode } from "react";

import { getMyCart } from "@/adapters/server/api/cart";
import { AppShell } from "@/components/shell/app-shell/app-shell";
import { CartRemovalNoticeProvider } from "@/features/cart/removal-memory";
import { CartHeaderAction } from "@/features/cart/ui/header-action/header-action";
import { CartPanel } from "@/features/cart/ui/panel/panel";
import { RepositoryLinks } from "@/features/site-info/ui/repository-links/repository-links";

const SITE_NAME = "nextjs-boilerplate";

const NAV_ITEMS = [
  { href: "/products", label: "商品" },
  { href: "/purchases", label: "購入履歴" },
  { href: "/mypage", label: "マイページ" },
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
 *
 * カートの中身をここで取ります。器は client ですが、明細の出所はバックエンドであり、client の
 * 状態として持ち回りません（[0023](../../../docs/adr/0023-stores-kernel.md)）。この取得は cookie を
 * 読むため、この route group の画面は動的描画になります。
 *
 * 取り消しの記憶も**カートの器より外**へ置きます。最後の 1 件を取り除くと脇の領域もカートの画面も
 * 空の姿へ変わるため、器の内側に持つとその切り替わりで記憶ごと失われます。
 */
export default async function ShopLayout({ children }: { children: ReactNode }) {
  const cart = await getMyCart();

  return (
    <CartRemovalNoticeProvider>
      <AppShell
        siteName={SITE_NAME}
        navItems={NAV_ITEMS}
        headerActions={<CartHeaderAction cart={cart} />}
        sidebar={<CartPanel cart={cart} />}
        footer={
          <div className="flex flex-col gap-3">
            <p>Next.js / React のプレゼンテーション層 boilerplate です。</p>
            <RepositoryLinks />
          </div>
        }
      >
        {children}
      </AppShell>
    </CartRemovalNoticeProvider>
  );
}
