import type { Screen } from "../../e2e/lib/screens";

/**
 * 何を計測するかの組み立て。
 *
 * @remarks
 * 開く画面は [`e2e/lib/screens.ts`](../../e2e/lib/screens.ts) の宣言をそのまま使います。**一覧を
 * ここで持ち直しません** —— 持ち直すと、画面を足した人が 2 箇所へ書くことになり、片方だけを
 * 足した状態が「予算に収まっている」として緑で通ります。宣言は build の出力と突き合わされる
 * ので、足した画面は必ずそちらへ現れます。
 */

/** 計測 1 件ぶんの指示。 */
export type Target = {
  /** 画面の名前。判定と表に出る。 */
  readonly name: string;
  /** 実際に開く URL。 */
  readonly url: string;
  /** 開く前に作る session の役割。要らない画面では `undefined`。 */
  readonly role: string | undefined;
};

/**
 * 画面の宣言から計測の指示を組み立てる。
 *
 * @param screens - `resolveScreens` が返した画面。
 * @param baseUrl - アプリの待ち受け先。
 *
 * @remarks
 * URL の組み立てを `URL` に任せるのは、宣言のパスが query を持つことと、ASCII の外の文字を
 * 持つことがあるためです（`/この経路は存在しない`）。文字列の連結で組むと、前者は二重の `?` に、
 * 後者は Chrome が拒む URL になります。
 */
export function planTargets(screens: readonly Screen[], baseUrl: string): Target[] {
  return screens.map((screen) => ({
    name: screen.name,
    url: new URL(screen.path, baseUrl).toString(),
    role: screen.signedIn,
  }));
}
