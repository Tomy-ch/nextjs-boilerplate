import { expect, test } from "../lib/test";

/**
 * 認証の前捌き（[0043](../../docs/adr/0043-middleware-policy.md) / [0079](../../docs/adr/0079-auth-frontend-seam.md)）。
 *
 * @remarks
 * 見るのは**保護されている経路の扱い**であって、その先に画面が在るかではありません。判定は
 * `src/proxy.ts` が接頭辞の宣言だけで行うため、画面を持たない接頭辞でも同じ経路を通ります。
 * 中立な接頭辞（`/account`）を使うのは、同梱サンプルの画面が破棄されても宣言そのものは残るからです。
 */

/** 保護されている接頭辞のうち、同梱サンプルと一緒に消えない 1 つ。 */
const PROTECTED_PATH = "/account";

test("未認証で保護された経路を開くと、復帰先を持ってログインへ送られる", async ({ page }) => {
  await page.goto(PROTECTED_PATH);

  await expect(page).toHaveURL(`/login?returnUrl=${encodeURIComponent(PROTECTED_PATH)}`);
  await expect(page.getByRole("button", { name: "ログインへ進む" })).toBeVisible();
});

test("session を持っていれば保護された経路で前捌きされない", async ({ page, signIn }) => {
  await signIn();

  await page.goto(PROTECTED_PATH);

  await expect(page).toHaveURL(PROTECTED_PATH);
});

test("session を持つ要求の応答は、静的な画面でも共有キャッシュへ載せない", async ({ page, signIn }) => {
  await signIn();

  // 静的に配れる画面を選ぶ。動的な画面は framework が自分で `no-store` を付けるため、
  // 前捌きの付けたヘッダが配信まで残ったことの証拠にならない。
  const response = await page.request.get("/about");

  expect(response.headers()["cache-control"]).toBe("private, no-store");
});

test("ログアウトすると保護された経路へ戻れなくなる", async ({ page, signIn }) => {
  await signIn();
  await page.goto(PROTECTED_PATH);

  // 転送を追わない。ログアウトは cookie を落として元の面へ戻す口であり、確かめたいのは戻り先では
  // なく「戻れなくなったこと」である。
  await page.request.post("/api/auth/logout", { maxRedirects: 0 });
  await page.goto(PROTECTED_PATH);

  await expect(page).toHaveURL(/\/login\?returnUrl=/);
});
