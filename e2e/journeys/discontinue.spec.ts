import { expect, test } from "../lib/test";

/**
 * 管理の一覧から商品を 1 件選び、廃番にするまで。
 *
 * @remarks
 * **選ぶ行はモックの応答で決まります。** 応答は URL ごとに固定され（`mocks/stable-responses.ts`）、
 * 一覧の行と廃番の画面が読む 1 件は口ごとに独立して組み立てられます。実行の入口が出るのは、
 * 1 件の応答が廃番でなく、見積もりに進行中の購入が無いときだけです。下の行はその条件に当たる
 * ものを選んであり、モックの生成規則が変われば選び直します。
 *
 * 廃番にした結果が利用者のカートへ及ぶことは見ません。モックは要求をまたいで状態を持たず、
 * 実行しても以後の応答は変わらないため、ここでは観測できません。
 */

/** 廃番を除いた一覧で、実行の入口まで辿れる行の商品名。 */
const TARGET_ROW_NAME = "全自動コーヒーメーカー ステンレスサーバー付き";

test("一覧の行操作から廃番の画面へ移り、条件を確かめて廃番にする", async ({ page, signIn }) => {
  await signIn("admin");
  await page.goto("/admin/products");

  // 選択肢は見えない radio を包む label が受ける。押すのは利用者と同じく label の側。
  await page.getByRole("group", { name: "廃番" }).getByText("廃番を除く", { exact: true }).click();
  await expect(page).toHaveURL(/[?&]discontinued=false(&|$)/);

  await page.getByRole("button", { name: `${TARGET_ROW_NAME} の操作` }).click();

  const entry = page.getByRole("menu").getByRole("menuitem", { name: "廃番にする" });
  // 遷移先は名前ではなく一覧が組み立てた href で照合する
  // （[README](../README.md#navigating-from-a-list-to-a-single-item)）。
  const href = await entry.getAttribute("href");

  await entry.click();

  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await expect(page.getByRole("heading", { name: "影響の見積もり" })).toBeVisible();

  await page.getByRole("textbox", { name: "値引き率（%）" }).fill("10");
  await page.getByRole("textbox", { name: "有効日数" }).fill("30");
  await page.getByRole("button", { name: "廃番にする" }).click();

  const dialog = page.getByRole("alertdialog");

  await expect(dialog).toContainText("値引き率 10%・有効 30 日");
  await dialog.getByRole("button", { name: "廃番にする" }).click();

  await expect(page.getByRole("alert").filter({ hasText: "廃番にしました" })).toBeVisible();
  await expect(dialog).toBeHidden();
});
