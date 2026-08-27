import { expect, test } from "../lib/test";

/**
 * 商品を探して 1 件へ辿り着くまで。
 *
 * @remarks
 * 画面をまたぐ遷移は story では代替できません。部品単体が緑でも、組み合わせた導線が繋がって
 * いない状態は作れます。
 */

test("トップから一覧へ入り、1 件の詳細まで辿り着く", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("ようこそ");

  await page.getByRole("navigation").getByRole("link", { name: "商品", exact: true }).click();
  // 読み進めた件数は URL へ書き戻される（[0073](../../docs/adr/0073-pagination-fetch-boundary.md)）
  // ため、着いた直後の URL に条件が付く。
  await expect(page).toHaveURL(/\/products(\?|$)/);

  const link = page.getByRole("list", { name: "商品の一覧" }).getByRole("link").first();
  // 遷移先は一覧が組み立てた href そのもの。名前で照合しないのは、モックが口ごとに独立して応答を
  // 組み立てるためで、一覧の 1 件と詳細の 1 件が同じ商品を指す保証は契約の側に無い。
  const href = await link.getAttribute("href");

  await link.click();

  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await expect(page.getByRole("heading", { level: 1 })).not.toBeEmpty();
});

test("絞り込みの条件が URL に残り、開き直しても同じ一覧になる", async ({ page }) => {
  await page.goto(`/products?keyword=${encodeURIComponent("鞄")}`);

  await expect(page.getByRole("searchbox", { name: "商品名で探す" })).toHaveValue("鞄");

  await page.reload();

  await expect(page.getByRole("searchbox", { name: "商品名で探す" })).toHaveValue("鞄");
});

test("存在しない経路が 404 の面になる", async ({ page }) => {
  const response = await page.goto("/この経路は存在しない");

  expect(response?.status()).toBe(404);
});
