import { expect, test } from "../lib/test";

/**
 * 別 origin からの要求の前捌き（[0111](../../docs/adr/0111-csp-security-headers.md) §5 / `docs/rules.md` #47）。
 *
 * @remarks
 * CI は `HTTP_ALLOWED_ORIGINS` を空で走らせるため、ここで見られるのは**閉じている側**だけです。
 * 開く側（宣言した origin に CORS ヘッダが付くこと）は `src/proxy.test.ts` が持ちます。
 *
 * 403 は設計された結果なので見張りには掛かりません（[`lib/browser-errors.ts`](../lib/browser-errors.ts)）。
 */

/** 宣言に無い別 origin。 */
const FOREIGN_ORIGIN = "https://foreign.invalid";

test("宣言に無い origin からの書き込みは handler へ届く前に 403 で止まる", async ({ page }) => {
  const response = await page.request.post("/api/telemetry", {
    headers: { origin: FOREIGN_ORIGIN, "content-type": "application/json" },
    data: {},
  });

  expect(response.status()).toBe(403);
});

test("宣言に無い origin からの preflight に CORS ヘッダを返さない", async ({ page }) => {
  const response = await page.request.fetch("/api/products", {
    method: "OPTIONS",
    headers: { origin: FOREIGN_ORIGIN, "access-control-request-method": "GET" },
  });

  expect(response.headers()["access-control-allow-origin"]).toBeUndefined();
});
