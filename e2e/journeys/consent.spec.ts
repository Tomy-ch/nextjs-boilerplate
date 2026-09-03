import { expect, test } from "@playwright/test";

import { CONSENT_BANNER_COPY } from "@/components/shell/consent-banner/consent-banner.definition";
import { MEASUREMENT_ID_COOKIE_NAME } from "@/model/consent";

/**
 * 同意を尋ねる面と、その裏で配られる計測 id（[0131](../../docs/adr/0131-cookie-consent.md)）。
 *
 * **`e2e/lib/test.ts` の test を使いません。** あちらは選び終えた状態から始めるため、尋ねる面が
 * そもそも出ません。ここが確かめたいのは選ぶ前の状態です。
 */

/** その名前の cookie が配られているか。 */
async function hasCookie(
  context: { cookies: () => Promise<{ name: string }[]> },
  name: string,
): Promise<boolean> {
  return (await context.cookies()).some((cookie) => cookie.name === name);
}

test("選び終えるまで尋ね続ける", async ({ page }) => {
  await page.goto("/about");

  const asking = page.getByRole("dialog", { name: CONSENT_BANNER_COPY.title });

  await expect(asking).toBeVisible();

  await page.keyboard.press("Escape");

  await expect(asking, "Escape で閉じられると、選ばれないまま尋ねるのをやめてしまう").toBeVisible();
});

test("同意する前は計測 id を配らない", async ({ page }) => {
  await page.goto("/about");

  await expect(page.getByRole("dialog", { name: CONSENT_BANNER_COPY.title })).toBeVisible();

  expect(await hasCookie(page.context(), MEASUREMENT_ID_COOKIE_NAME)).toBe(false);
});

test("同意すると尋ねるのをやめ、計測 id を配る", async ({ page }) => {
  await page.goto("/about");
  await page.getByRole("button", { name: CONSENT_BANNER_COPY.accept }).click();

  await expect(page.getByRole("dialog", { name: CONSENT_BANNER_COPY.title })).toBeHidden();

  await page.reload();

  expect(await hasCookie(page.context(), MEASUREMENT_ID_COOKIE_NAME)).toBe(true);
});

test("必要なものだけを選ぶと、尋ねるのをやめたうえで計測 id を配らない", async ({ page }) => {
  await page.goto("/about");
  await page.getByRole("button", { name: CONSENT_BANNER_COPY.reject }).click();

  await expect(page.getByRole("dialog", { name: CONSENT_BANNER_COPY.title })).toBeHidden();

  await page.reload();

  expect(await hasCookie(page.context(), MEASUREMENT_ID_COOKIE_NAME)).toBe(false);
});
