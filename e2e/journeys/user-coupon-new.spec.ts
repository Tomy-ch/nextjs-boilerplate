import { expect, test } from "../lib/test";

test("利用者一覧の行から発行画面へ移り、内容を確かめてクーポンを発行すると画面に留まって報せる", async ({
  page,
  signIn,
}) => {
  await signIn("admin");
  await page.goto("/admin/users?scope=active");

  await page
    .getByRole("button", { name: / の操作$/ })
    .first()
    .click();
  await page.getByRole("menuitem", { name: "クーポンを発行する" }).click();
  await expect(page).toHaveURL(/\/admin\/users\/[^/]+\/coupons\/new$/);

  await page
    .getByRole("group", { name: "値引きの種類" })
    .getByText("定額", { exact: true })
    .click();
  await page.getByRole("textbox", { name: "値引き額（ドル）" }).fill("5.00");

  await page
    .getByRole("group", { name: "対象の範囲" })
    .getByText("全商品", { exact: true })
    .click();

  await page.getByLabel("有効期限", { exact: true }).fill("2030-12-31T23:59");

  await page.getByRole("button", { name: "内容を確認する" }).click();

  const dialog = page.getByRole("alertdialog");

  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "発行する" }).click();

  await expect(page.getByText(/さんにクーポンを 1 枚発行しました$/)).toBeVisible();
  await expect(page).toHaveURL(/\/coupons\/new$/);
});
