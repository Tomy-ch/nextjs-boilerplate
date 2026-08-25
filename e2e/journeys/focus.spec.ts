import type { Locator, Page } from "@playwright/test";

import { expect, test } from "../lib/test";
import { loadBreakpoints, VIEWPORT_HEIGHT } from "../lib/viewports";

/**
 * 被せた面を開いたときの焦点の行き先（[0053](../../docs/adr/0053-ui-component-interaction-seam.md)）。
 *
 * @remarks
 * **jsdom はフォーカスの実装を持ちません。** `inert` を実装せず、focus trap はブラウザの実装で
 * あって jsdom のそれではなく、`Tab` の巡回順も DOM 順から算出した近似です。したがって
 * component テストの `toHaveFocus` が確かめているのは「その要素へ focus を当てられること」で
 * あって、**開いたときに焦点が入るか・Tab が背面へ抜けないか・閉じたときに戻るか**ではありません。
 * ここが唯一の検査地点です。
 *
 * 見るのはその 3 点だけで、網羅はしません。**題材の画面ではなく機構を見ている**ので、ジャーニーを
 * 自分の画面へ書き換えるときも、機構ごとに 1 本という形は残してください（[README](../README.md)）。
 *
 * **面の種類で 3 点目の形が違います。** dialog は開いている間じゅう巡回を閉じ込めますが、menu は
 * `Tab` で閉じるのが正しい挙動です（巡回するのは矢印キーで、menu は文書の巡回から外れる）。
 * 同じ主張を当てると、正しい実装のほうが落ちます。
 */

/** 面の中と外を往復させるのに十分な回数。巡回が閉じていれば、何周しても外へは出ない。 */
const TAB_COUNT = 12;

/** いま焦点がある要素が、指定した面の中に居るか。 */
async function focusIsInside(surface: Locator): Promise<boolean> {
  return surface.evaluate((element) => {
    const active = element.ownerDocument.activeElement;

    return active !== null && element.contains(active);
  });
}

/**
 * 開いた面が焦点を受け取り、閉じたら開いた導線へ返すことを確かめる。
 *
 * @remarks
 * 2 点を 1 本にまとめてあります。**順序そのものが検査**だからです。焦点が入っていない状態で
 * 戻り先を見ても、戻ったのか一度も動いていないのかが区別できません。
 *
 * @param page - 対象のページ
 * @param trigger - 面を開く操作。閉じたあとに焦点が戻る先でもある
 * @param surface - 開いた面。`dialog` / `menu` などの role で引く
 */
async function expectsFocusEntersAndReturns(
  page: Page,
  trigger: Locator,
  surface: Locator,
): Promise<void> {
  await trigger.click();
  await expect(surface).toBeVisible();

  // 開いた直後。焦点が背面に残っていると、支援技術の利用者には面が開いたことが伝わらない。
  expect(await focusIsInside(surface)).toBe(true);

  await page.keyboard.press("Escape");
  await expect(surface).toBeHidden();

  // 開いた導線へ戻す。戻さないと、閉じた利用者は文書の先頭から辿り直すことになる。
  await expect(trigger).toBeFocused();
}

test.describe("ドロワー", () => {
  // 被せる姿の入口が出る幅。脇に常設できる幅では、そもそもこの面が無い。
  test.use({
    viewport: { width: (loadBreakpoints().get("md") as number) - 1, height: VIEWPORT_HEIGHT },
  });

  test("開くと焦点が面へ入り、閉じると導線へ戻る", async ({ page }) => {
    await page.goto("/about");

    await expectsFocusEntersAndReturns(
      page,
      page.getByRole("button", { name: "メニューを開く" }),
      page.getByRole("dialog"),
    );
  });

  test("開いている間、Tab が背面へ抜けない", async ({ page }) => {
    await page.goto("/about");

    const surface = page.getByRole("dialog");

    await page.getByRole("button", { name: "メニューを開く" }).click();
    await expect(surface).toBeVisible();

    for (let step = 0; step < TAB_COUNT; step += 1) {
      await page.keyboard.press("Tab");

      // 一度でも外へ出れば、そこから先は背面を触れてしまう。周回の途中で見る。
      expect(await focusIsInside(surface)).toBe(true);
    }
  });
});

test.describe("モーダル", () => {
  test("開くと焦点が面へ入り、閉じると導線へ戻る", async ({ page, signIn }) => {
    await signIn("admin");
    await page.goto("/admin/analytics");

    await expectsFocusEntersAndReturns(
      page,
      page.getByRole("button", { name: "期間を指定" }),
      page.getByRole("dialog"),
    );
  });

  test("開いている間、Tab が背面へ抜けない", async ({ page, signIn }) => {
    await signIn("admin");
    await page.goto("/admin/analytics");

    const surface = page.getByRole("dialog");

    await page.getByRole("button", { name: "期間を指定" }).click();
    await expect(surface).toBeVisible();

    for (let step = 0; step < TAB_COUNT; step += 1) {
      await page.keyboard.press("Tab");

      expect(await focusIsInside(surface)).toBe(true);
    }
  });
});

test.describe("メニュー", () => {
  test("開くと焦点が面へ入り、閉じると導線へ戻る", async ({ page, signIn }) => {
    await signIn("admin");
    await page.goto("/admin/users");

    await expectsFocusEntersAndReturns(
      page,
      page.getByRole("button", { name: /の操作$/ }).first(),
      page.getByRole("menu"),
    );
  });

  test("Tab で閉じ、背面に開いたままの面を残さない", async ({ page, signIn }) => {
    await signIn("admin");
    await page.goto("/admin/users");

    const trigger = page.getByRole("button", { name: /の操作$/ }).first();
    const surface = page.getByRole("menu");

    await trigger.click();
    await expect(surface).toBeVisible();

    // menu は文書の巡回から外れる。閉じずに残ると、見えている面の外を Tab が進むことになる。
    await page.keyboard.press("Tab");

    await expect(surface).toBeHidden();
  });
});
