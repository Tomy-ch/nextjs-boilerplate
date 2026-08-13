import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/components/cn";
import { PullToRefresh } from "../pull-to-refresh/pull-to-refresh";
import { APP_SHELL_MAIN_ID, type AppShellNavItem } from "./app-shell.definition";
import { AppShellMenu } from "./app-shell-menu";

/** `AppShell` の props。 */
export type AppShellProps = {
  /** header 左端に置く名称。遷移先はトップ。 */
  siteName: string;
  /** header に並べる導線。狭い画面では side menu に畳まれる。 */
  navItems: readonly AppShellNavItem[];
  /** `main` の中身。 */
  children: ReactNode;
  /** header の導線の後ろに並べる要素。 */
  headerActions?: ReactNode;
  /** `main` の脇に並べる領域。幅と区切り線は渡す側が決める。 */
  sidebar?: ReactNode;
  /** footer に置く文言。 */
  footer?: ReactNode;
  /** `main` に追加する class 名。 */
  className?: string;
};

/**
 * 画面の外枠。header / nav / skip link / `main` / footer を持つ。
 *
 * @remarks
 * **`main` は幅を絞りません。** 読み幅と左右余白は `ContentContainer` の責務です。両方が幅を
 * 持つと、画面ごとにどちらが効いているのかを読まないと分からなくなります。全幅の背景や図を
 * 置く画面も、shell を剥がさずに済みます。
 *
 * skip link を先頭に置くのは、キーボードと支援技術の利用者が header の導線を毎回辿らずに
 * 本文へ入れるようにするためです（[0100](../../../../docs/adr/0100-accessibility-target.md)）。
 *
 * admin 側は別の shell を持ちます。見せる相手も導線も違うため、1 枚にまとめると分岐を shell の
 * 中に抱えることになります。
 *
 * **`sidebar` と `headerActions` の中身は知りません。** 置き場所だけを用意し、何を出すか・いつ出すか・
 * どれだけの幅を取るかは渡す側が決めます。shell が中身を知ると、画面ごとの出し分けが分岐として
 * ここに集まります（[0026](../../../../docs/adr/0026-layout-shell-mount.md)）。
 *
 * @see Storybook `Layout/AppShell`
 */
export function AppShell({
  siteName,
  navItems,
  children,
  headerActions,
  sidebar,
  footer,
  className,
}: AppShellProps) {
  return (
    <>
      <PullToRefresh />
      <a
        href={`#${APP_SHELL_MAIN_ID}`}
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      >
        本文へスキップ
      </a>
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-2 px-4 md:px-6">
          <AppShellMenu items={navItems} />
          <Link href="/" className="font-semibold">
            {siteName}
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <nav aria-label="主要な導線" className="hidden items-center gap-1 md:flex">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            {headerActions}
          </div>
        </div>
      </header>
      <div className="flex flex-1 flex-col md:flex-row">
        <main id={APP_SHELL_MAIN_ID} className={cn("flex-1", className)}>
          {children}
        </main>
        {sidebar}
      </div>
      <footer className="border-t py-6">
        <div className="mx-auto w-full max-w-5xl px-4 text-sm text-muted-foreground md:px-6">
          {footer}
        </div>
      </footer>
    </>
  );
}
