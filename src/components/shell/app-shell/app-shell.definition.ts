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
 * header が占める高さ（px）。
 *
 * @remarks
 * header は画面の上端に貼り付くため、その下へ貼り付ける要素は自分の止まる位置をこの分だけ
 * 下げる。header 自身もこの値で描くので、貼り付き位置と実際の高さがずれない。
 *
 * **内訳は導線の行 56px と下の境界線 1px。** 占める高さを表す値なので境界線を含む。含めずに
 * 描くと、境界線のぶん header 自身が縮み、下に続く画面がまるごと 1px せり上がる。
 *
 * **測らずに押し付けるのは、これが決められる量だからである。** 同じ画面で帯の高さは
 * `ResizeObserver` で測っているが（`features/products/list/ui/sticky-region`）、あちらは条件の数で
 * 折り返して変わる —— 中身が決める量なので、測る以外に知る方法が無い。header の高さは中身が
 * どう変わっても動かない値としてここが決め、header 自身がこの値で描く。押し付けている限り、
 * 書き写した値と実際の描画がずれることは起こらない。
 *
 * 測る形にすると、SSR と最初の描画のあいだ配れる値が 0 になり、測り終えるまで下に貼り付く要素が
 * 正しくない位置に立つ。**知り得る量を、知るまで間違っている仕組みに置き換えることになる。**
 */
export const APP_SHELL_HEADER_HEIGHT = 57;

/**
 * header の下に貼り付ける要素と、header との間に空ける余白（px）。
 *
 * @remarks
 * 貼り付く位置は「header が占める高さ + この余白」で決まります。画面ごとに数えると、header の
 * 高さが動いたときに追随する場所としない場所が生まれ、貼り付いた要素が header へ食い込みます。
 */
export const APP_SHELL_STICKY_GAP = 12;
