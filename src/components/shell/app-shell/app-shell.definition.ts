/** shell が並べる導線 1 件。 */
export type AppShellNavItem = {
  /** 遷移先のパス。 */
  href: string;
  /** 導線の表示名。 */
  label: string;
};

/** skip link の飛び先。`main` の id と対で使う。 */
export const APP_SHELL_MAIN_ID = "main-content";
