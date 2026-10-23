import { expect, test } from "../lib/test";

/**
 * カートから購入確認へ進み、クーポンを 1 枚選んで注文を確定するまで。
 *
 * @remarks
 * **選ぶ候補はモックの応答で決まります。** 候補とカートは `mocks/references.ts` が噛み合う組に
 * 揃えており、下の候補はその組の 1 つです。モックの揃え方が変われば選び直します。
 *
 * 完了画面は到達だけを見ます。モックは要求をまたいで状態を持たず、完了画面の応答は送信の中身と
 * 無関係に固定されているため、そこに出る値引きは選んだクーポンの証になりません。送信に `couponId`
 * が載ることは Vitest（`features/checkout`）が固定します。
 */

/** 値引きの立つ候補の見出し。 */
const TARGET_COUPON = /10% 引き（上限 \$1\.00）/;

test("カートから購入確認へ進み、クーポンを選んで注文を確定する", async ({ page, signIn }) => {
  await signIn();
  await page.goto("/cart");

  await page.getByRole("link", { name: "購入手続きへ" }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/checkout$/);

  const coupons = page.getByRole("radiogroup", { name: "クーポン" });

  await expect(coupons.getByRole("radio", { name: "使わない" })).not.toBeChecked();
  const target = coupons.getByRole("radio", { name: TARGET_COUPON });

  await target.check();
  await expect(target).toBeChecked();
  await expect(
    page.getByText("クーポン値引き（見込み）", { exact: true }).filter({ visible: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "注文を確定する" }).filter({ visible: true }).click();

  await expect(page).toHaveURL(/\/checkout\/complete\?/);
});
