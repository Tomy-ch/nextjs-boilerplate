// 撮影時の「今日」を固定する。
//
// story 側で日付を pin しても、部品が自分で読む現在時刻までは止まらない。react-day-picker の
// 「今日」は実時刻から決まり、calendar.tsx がそのセルへ強調を当てるため、表示月の中で強調の
// 位置が毎日動く。何も変えていない日に基準画像が差分として上がるのはこれで、放っておくと
// base の基準画像が毎日撮り直され続ける。
//
// 止めるのは story ではなく撮影の側。時刻を読む部品はこれからも増えるので、部品ごとに prop で
// 殺すと取りこぼしが出る。宣言をここ 1 箇所に置くのは、撮影と a11y が同じ時刻を読むため。
import type { Page } from "@playwright/test";

/**
 * 撮影時に「今日」として読ませる時刻。
 *
 * @remarks
 * 日付を pin した story の表示月(2026-08)の中に置いています。月の外へ置くと「今日」の見た目が
 * どの story にも出ず、強調そのものが退行しても気づけません。選択・無効のどの範囲とも重ねて
 * いないのは、重ねると今日の強調が他の状態の見た目に紛れるためです。
 */
export const FIXED_NOW = new Date("2026-08-18T12:00:00+09:00");

/**
 * ページが読む現在時刻を [FIXED_NOW](#FIXED_NOW) に固定する。
 *
 * @remarks
 * タイマーは動かしたまま `Date` だけを差し替えます(`clock.install` ではなく `setFixedTime`)。
 * タイマーごと止めると、`setTimeout` で描画を進める story が初期状態のまま撮られ、時計とは
 * 無関係な差分を撮影の側が作ります。
 */
export async function installFixedClock(page: Page): Promise<void> {
  await page.clock.setFixedTime(FIXED_NOW);
}
