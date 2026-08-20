import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { verifySession } from "@/adapters/server/auth/session";
import { Button } from "@/components/design-system/action/button/button";
import { AdminShell } from "@/components/shell/admin-shell/admin-shell";
import type { AdminShellNavGroup } from "@/components/shell/admin-shell/admin-shell.definition";
import {
  ADMIN_ANALYTICS_PATH,
  ADMIN_DASHBOARD_PATH,
  ADMIN_PRODUCT_LIST_PATH,
} from "@/features/admin/paths";
import { isAdmin } from "@/model/authz";

const SITE_NAME = "nextjs-boilerplate";
const CONSOLE_NAME = "管理";

/** サイトのトップ。役割が足りないときの行き先も兼ねる。 */
const SITE_PATH = "/";

/** 利用者向け画面のうち、管理側から見比べたくなる画面。 */
const USER_SITE_PATH = "/products";

const NAV_GROUPS: readonly AdminShellNavGroup[] = [
  {
    label: "集計",
    items: [
      { href: ADMIN_DASHBOARD_PATH, label: "ダッシュボード" },
      { href: ADMIN_ANALYTICS_PATH, label: "期間別の集計" },
    ],
  },
  { label: "商品", items: [{ href: ADMIN_PRODUCT_LIST_PATH, label: "商品一覧管理" }] },
];

/**
 * 管理画面の外枠。
 *
 * @remarks
 * **ここが確定認可です**（[0079](../../../docs/adr/0079-auth-frontend-seam.md)）。判定に使う役割の
 * 宣言は `model/authz` にあり、前捌き（`proxy.ts`）と同じものを引きます。
 *
 * 送り返す先は前捌き（`proxy.ts`）と同じにします。行き先とその理由、403 の面を出さない理由は
 * `docs/spec/route/admin/layout.function.md`「入れない主体をどこへ送るか」。
 *
 * 導線の顔ぶれをこの層が持つのは、admin にどの画面があるかが route の構成そのものだからです。
 * 器（`AdminShell`）は並べ方だけを知り、何を並べるかは知りません
 * （[0026](../../../docs/adr/0026-layout-shell-mount.md)）。
 *
 * 利用者向けの `(shop)` とは別の器を敷きます。root layout が持つのは `html` / `body` と Provider の
 * mount だけで、器の選択はこの段が行います。
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!isAdmin(await verifySession())) {
    redirect(SITE_PATH);
  }

  return (
    <AdminShell
      consoleName={CONSOLE_NAME}
      headerActions={
        <Button asChild size="sm" variant="outline">
          <Link href={USER_SITE_PATH}>ユーザー画面へ</Link>
        </Button>
      }
      homeHref={ADMIN_DASHBOARD_PATH}
      navGroups={NAV_GROUPS}
      siteHref={SITE_PATH}
      siteName={SITE_NAME}
    >
      {children}
    </AdminShell>
  );
}
