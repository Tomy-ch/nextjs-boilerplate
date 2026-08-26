import type { ReactNode } from "react";

import { verifySession } from "@/adapters/server/auth/session";
import { AppShell } from "@/components/shell/app-shell/app-shell";
import { ADMIN_PRODUCT_LIST_PATH } from "@/features/admin/paths";
import { CartRemovalNoticeProvider } from "@/features/cart/removal-memory";
import { readShellCart } from "@/features/cart/shell-cart";
import { CartHeaderAction } from "@/features/cart/ui/header-action/header-action";
import { CartPanel } from "@/features/cart/ui/panel/panel";
import { SiteFooter } from "@/features/site-info/ui/site-footer/site-footer";
import { isAdmin } from "@/model/authz";

import { GLOBAL_NAV_ITEMS } from "../global-nav";

const SITE_NAME = "nextjs-boilerplate";

/**
 * 管理画面への入口。
 *
 * @remarks
 * 役割を持つ人にしか出しません。**押せる場所を作らないことが出し分けです。** 出したうえで押した
 * 先で断ると、管理の面がある事実だけが誰にでも伝わります
 * （[0079](../../../docs/adr/0079-auth-frontend-seam.md)）。
 */
const ADMIN_NAV_ITEM = { href: ADMIN_PRODUCT_LIST_PATH, label: "管理" };

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
 * 状態として持ち回りません（[0023](../../../docs/adr/0023-stores-kernel.md)）。
 *
 * **この取得は cookie を読むため、この route group の画面はすべて動的描画になります。** 静的な殻と
 * 動的な穴を分ける仕組み（PPR）は採っていないため（[0041](../../../docs/adr/0041-cache-components-decision.md)）、
 * どの画面にも同じカートを出すことと引き換えに払う代償です。取得を持たない案内の 3 枚は、この器を
 * 通さないところへ出して固めてあります（`src/app/(site-info)/layout.tsx`）。
 *
 * **読めなかったときはカートを出さずに続けます。** ここで投げると、同じ段の layout を包む
 * `error` 境界が無いため（子の `error.tsx` は親 layout の失敗を捕まえません）、header も nav も
 * 消えた画面まで落ちます。カートが読めない状況ではカートの画面自体も開けないので、外枠から
 * 入口を落としても到達できる場所は減りません
 * （[0080](../../../docs/adr/0080-error-handling.md)）。
 *
 * 取り消しの記憶も**カートの器より外**へ置きます。最後の 1 件を取り除くと脇の領域もカートの画面も
 * 空の姿へ変わるため、器の内側に持つとその切り替わりで記憶ごと失われます。**ただしこの器を離れると
 * 失われます** —— route group の境界は client 状態の境界でもあり、買い物から出た時点で失ってよい
 * ものとして扱っています（[0026](../../../docs/adr/0026-layout-shell-mount.md)）。
 */
export default async function ShopLayout({ children }: { children: ReactNode }) {
  const [cart, session] = await Promise.all([readShellCart(), verifySession()]);
  const navItems = isAdmin(session) ? [...GLOBAL_NAV_ITEMS, ADMIN_NAV_ITEM] : GLOBAL_NAV_ITEMS;

  return (
    <CartRemovalNoticeProvider>
      <AppShell
        siteName={SITE_NAME}
        navItems={navItems}
        headerActions={cart === null ? null : <CartHeaderAction cart={cart} />}
        sidebar={cart === null ? null : <CartPanel cart={cart} />}
        footer={<SiteFooter />}
      >
        {children}
      </AppShell>
    </CartRemovalNoticeProvider>
  );
}
