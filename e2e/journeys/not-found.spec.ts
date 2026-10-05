import { expect, test } from "../lib/test";

/**
 * 見つからない 1 件を開いたときの不在の面。
 *
 * @remarks
 * どの not-found 境界が受けるかは segment の木が決めるので、segment を持たない単体の描画テストには
 * 見えません。指し先を `absent` にすると、モックが 404 を返します（`mocks/absent.ts`）。
 */

test("見つからない購入を開くと、器の内側に不在の面と履歴へ戻る導線が出る", async ({
  page,
  signIn,
}) => {
  await signIn();
  await page.goto("/purchases/absent");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("対象が見つかりません。");
  await expect(page.getByRole("link", { name: "購入履歴へ戻る" })).toHaveAttribute(
    "href",
    "/purchases",
  );
  // 器の外の root の面へ抜けると、header ごと消える。root の外枠は header を持たない。
  await expect(page.getByRole("banner")).toBeVisible();
});
