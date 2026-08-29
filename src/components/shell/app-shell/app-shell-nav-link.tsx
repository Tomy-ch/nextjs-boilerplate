import Link from "next/link";

import type { AppShellNavItem } from "./app-shell.definition";

/** `AppShellNavLink` の props。 */
export type AppShellNavLinkProps = {
  /** 遷移先と表示名。 */
  item: AppShellNavItem;
  /**
   * 履歴を積まずに移るか。
   *
   * @remarks
   * side menu の中の導線だけが立てます。overlay が積んだ履歴 1 件を移り先で上書きするためで
   * （`AppShellMenu`）、overlay を持たない header の横並びには積むものがありません。
   */
  replace?: boolean;
};

/**
 * shell が並べる導線 1 件。
 *
 * @remarks
 * header の横並びと side menu の両方がこれを使います。同じ見た目を 2 か所へ書くと、片方だけを
 * 直した変更が「揃っているつもり」で通ります。
 *
 * **主体で出し分ける導線もこれを使います。** 出し分けは取得を待つため穴の内側に居ますが、
 * 見た目は殻の側と同じでなければ、待ち終わった瞬間に並びの中で 1 件だけ姿が変わります。
 */
export function AppShellNavLink({ item, replace }: AppShellNavLinkProps) {
  return (
    <Link
      href={item.href}
      className="rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
      replace={replace}
    >
      {item.label}
    </Link>
  );
}
