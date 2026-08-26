import type { AppShellNavItem } from "@/components/shell/app-shell/app-shell.definition";

/**
 * 利用者向けの shell が並べる global nav。
 *
 * @remarks
 * 器を 2 つの route group が持つため、宣言はどちらの外にも属さない場所へ置きます。`(shop)` は
 * 動的に描かれ、`(site-info)` は build 時に固まるという理由だけで分かれており
 * （[0040](../../docs/adr/0040-routing-rendering-strategy.md)）、**利用者から見れば同じサイトの
 * 同じ導線**です。layout ごとに書くと、行き先を足した人が片方だけを直せてしまい、通った画面に
 * よって行ける場所が変わります。
 *
 * 役割で出し分ける導線はここに持ちません。出す・出さないの判定を伴うものは、その判定を持つ
 * layout が自分で足します（[0079](../../docs/adr/0079-auth-frontend-seam.md)）。
 */
export const GLOBAL_NAV_ITEMS: readonly AppShellNavItem[] = [
  { href: "/products", label: "商品" },
  { href: "/purchases", label: "購入履歴" },
  { href: "/mypage", label: "マイページ" },
];
