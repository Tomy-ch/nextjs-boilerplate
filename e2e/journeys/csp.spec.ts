import { expect, test } from "@playwright/test";

/**
 * CSP が配信され、ブラウザが enforce していること（[0111](../../docs/adr/0111-csp-security-headers.md)）。
 *
 * @remarks
 * **見張りの外で書く唯一の spec です。** 宣言に無い配信元の script を自分で差し、違反として
 * 報告されることを確かめます。見張り（[`lib/test.ts`](../lib/test.ts)）の内側で書くと、確かめた
 * 違反そのもので落ちます。
 *
 * 見ているのは違反の検知であって、ヘッダの存在ではありません。存在は DAST が見ます
 * （[0110](../../docs/adr/0110-security-operations.md) §3.5）。`Report-Only` へ緩めても、
 * ヘッダを読むだけの検査は通ります —— この spec は通りません。
 */

/** 宣言に無い配信元。解決しない名前を使い、CSP より後ろへ行かないことを確かにする。 */
const FOREIGN_SCRIPT = "https://probe.invalid/script.js";

test("宣言に無い配信元の script は実行されず、違反として報告される", async ({ page }) => {
  await page.goto("/about");

  const violated = await page.evaluate(
    (src) =>
      new Promise<string>((resolve) => {
        document.addEventListener(
          "securitypolicyviolation",
          (event) => resolve(event.violatedDirective),
          { once: true },
        );

        const script = document.createElement("script");
        script.src = src;
        document.head.append(script);
      }),
    FOREIGN_SCRIPT,
  );

  // 描画エンジンによって、割った側（`-elem`）で報告するか元のディレクティブで報告するかが違う。
  expect(["script-src", "script-src-elem"]).toContain(violated);
});
