import { expect, test } from "../lib/test";

test("一覧の導線から作成画面へ移り、内容を確かめてキャンペーンを定義すると一覧へ戻る", async ({
  page,
  signIn,
}) => {
  await signIn("admin");
  await page.goto("/admin/campaigns");

  await page.getByRole("link", { name: "キャンペーンを作成" }).click();
  await expect(page).toHaveURL(/\/admin\/campaigns\/new$/);

  await page.getByRole("textbox", { name: "キャンペーンコード" }).fill("autumn-2030");

  await page
    .getByRole("group", { name: "値引きの種類" })
    .getByText("定率", { exact: true })
    .click();
  await page.getByRole("textbox", { name: "値引き率（%）" }).fill("15");
  await page.getByRole("textbox", { name: "上限額（ドル）" }).fill("20");

  await page
    .getByRole("group", { name: "対象の範囲" })
    .getByText("全商品", { exact: true })
    .click();

  await page.getByLabel("配布開始", { exact: true }).fill("2030-10-01T00:00");
  await page.getByLabel("配布終了", { exact: true }).fill("2030-11-30T23:59");
  await page.getByLabel("クーポンの有効期限", { exact: true }).fill("2030-12-31T23:59");

  await page.getByRole("spinbutton", { name: "総枚数の上限" }).fill("1000");
  await page.getByRole("spinbutton", { name: "1 人あたりの上限" }).fill("1");

  await page.getByRole("button", { name: "内容を確認する" }).click();

  const dialog = page.getByRole("alertdialog");

  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "定義する" }).click();

  await expect(page).toHaveURL(/\/admin\/campaigns$/);
});
