// 撮影時の「今日」を決める。story の pin が届かない、部品が自分で読む現在時刻を受け持つ。
// 撮影と a11y が同じ時刻を読むよう、宣言はここだけに置く。
import type { Page } from "@playwright/test";

/** 撮影時に「今日」として読ませる時刻。 */
export const FIXED_NOW = new Date("2024-01-01T00:00:00Z");

/**
 * ページが読む現在時刻を [FIXED_NOW](#FIXED_NOW) に固定する。ページを開く前に呼ぶこと。
 *
 * @remarks
 * 差し替えるのは `Date` だけで、タイマーは実時間で走ります(`clock.install` ではない)。
 * タイマーごと止めると、`setTimeout` で描画を進める story が初期状態のまま撮られます。
 */
export async function installFixedClock(page: Page): Promise<void> {
  await page.clock.setFixedTime(FIXED_NOW);
}
