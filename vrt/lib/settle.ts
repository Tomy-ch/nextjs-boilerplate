import type { Page } from "@playwright/test";

/**
 * story が描き切るのを待つ上限。
 *
 * @remarks
 * test 全体の上限（`playwright.config.ts` の `timeout`）より十分に短く取ります。同じ値に任せると、
 * 描き切らない story 1 件が上限をまるごと使い、`retries` の回数だけそれを繰り返します。story 数が
 * 多いので、数件の道連れで実行時間が倍近くまで伸び、ログには「時間切れ」しか残りません。
 */
const RENDER_TIMEOUT_MS = 15_000;

/**
 * 描画とフォントの読み込みが終わるのを待つ。
 *
 * @remarks
 * 描画の完了は配色テーマが `:root` へ乗ったことで見ます。テーマを載せるのが story を包む
 * decorator（`.storybook/preview.ts`）なので、乗っていれば story まで到達しています。要素の
 * 出現で見ると、描画前の空の `#storybook-root` を「安定した画面」として扱ってしまいます。
 *
 * フォントは差し替わった瞬間に字形が変わるため、待たずに撮ると同じ story が撮るたびに違う
 * 画像になります。
 */
export async function settle(page: Page, theme: string): Promise<void> {
  try {
    await page.waitForFunction(
      (expected) => document.documentElement.dataset.theme === expected,
      theme,
      { timeout: RENDER_TIMEOUT_MS },
    );
  } catch (cause) {
    throw new Error(
      `story が描き切りませんでした（${RENDER_TIMEOUT_MS / 1000} 秒）。テーマを載せる decorator が` +
        "一度も走っていません。story の module が読み込みに失敗していないか、Storybook で" +
        "同じ story を開いて確かめてください。",
      { cause },
    );
  }
  await page.evaluate(() => document.fonts.ready);
}
