/** shell が並べる導線 1 件。 */
export type AppShellNavItem = {
  /** 遷移先のパス。 */
  href: string;
  /** 導線の表示名。 */
  label: string;
};

/** skip link の飛び先。`main` の id と対で使う。 */
export const APP_SHELL_MAIN_ID = "main-content";

/**
 * header の高さ（px）。
 *
 * @remarks
 * header は画面の上端に貼り付くため、その下へ貼り付ける要素は自分の止まる位置をこの分だけ
 * 下げる。header 自身もこの値で描くので、貼り付き位置と実際の高さがずれない。**下の境界線を
 * 含めた値**で、内訳ではなく占める高さを表す。
 */
export const APP_SHELL_HEADER_HEIGHT = 56;
