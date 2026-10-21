import { expect, test } from "../lib/test";

const TARGET_CODE = "WELCOME";

test("一覧の行操作からキャンペーンの配布を停止する", async ({ page, signIn }) => {
  await signIn("admin");
  await page.goto("/admin/campaigns");

  await page.getByRole("button", { name: `${TARGET_CODE} の操作` }).click();
  await page.getByRole("menu").getByRole("menuitem", { name: "停止する" }).click();

  const dialog = page.getByRole("alertdialog");

  await expect(dialog).toContainText(`${TARGET_CODE} の配布を停止しますか？`);
  await expect(dialog).toContainText("すでに配ったクーポンは無効にならない");

  await dialog.getByRole("button", { name: "停止する" }).click();

  await expect(
    page.getByRole("alert").filter({ hasText: `${TARGET_CODE} の配布を停止しました` }),
  ).toBeVisible();
  await expect(dialog).toBeHidden();
});
