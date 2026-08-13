import type { Page } from "@playwright/test";

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
 *
 * 撮影と a11y 検査の双方が同じ待ち方をする必要があるため、spec からは切り出してあります。
 */
export async function settle(page: Page, theme: string): Promise<void> {
  await page.waitForFunction(
    (expected) => document.documentElement.dataset.theme === expected,
    theme,
  );
  await page.evaluate(() => document.fonts.ready);
}
