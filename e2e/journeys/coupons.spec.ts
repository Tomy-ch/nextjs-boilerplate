import { expect, test } from "../lib/test";

/**
 * マイページから保有クーポンの画面へ移り、キャンペーンコードで 1 枚受け取るまで。
 *
 * @remarks
 * **一覧の行はモックの応答で決まります**（`orval.config.ts` の保有クーポンの応答）。状態の内訳は
 * 時刻の設定で変わるため、時刻に依らない使用済みの行と行の数だけを見ます。
 *
 * 受け取った結果として一覧が 1 行増えることは見ません。モックは要求をまたいで状態を持たず、
 * 受け取っても取り直した一覧は変わらないため、ここでは観測できません。
 */
test("マイページの導線から保有クーポンへ移り、コードで受け取る", async ({ page, signIn }) => {
  await signIn("user");
  await page.goto("/mypage");

  await page.getByRole("link", { name: /クーポン/ }).click();

  await expect(page).toHaveURL(/\/mypage\/coupons$/);
  await expect(page.getByRole("heading", { level: 1, name: "クーポン" })).toBeVisible();

  const rows = page.getByRole("list", { name: "保有クーポンの一覧" }).getByRole("listitem");

  await expect(rows).toHaveCount(5);
  await expect(rows.filter({ hasText: "使用済み" })).toHaveCount(1);

  const field = page.getByRole("textbox", { name: "キャンペーンコード" });

  await field.fill("SPRING2026");
  await page.getByRole("button", { name: "受け取る" }).click();

  await expect(page.getByText("クーポンを受け取りました")).toBeVisible();
  await expect(field).toHaveValue("");
});
