import { readFileSync } from "node:fs";

import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

import { CONFORMANCE_TAGS, SCREEN_ONLY_RULES, screenDisabledRuleIds } from "../lib/a11y-rules";
import {
  listScreenRoutes,
  resolveScreens,
  SCREEN_MANIFEST_FILE,
  SCREENS,
  selectScreens,
} from "../lib/screens";
import { expect, test } from "../lib/test";

/**
 * 画面 1 枚ぶんに axe を掛ける。
 *
 * @remarks
 * landmark・`main`・h1 と、配信される document は story 単位の検査（`vrt/a11y.spec.ts`）では
 * 成立せず、ここでだけ見られます（[README](../README.md) の「画面単位の a11y」）。前者 3 つを
 * 持つのは [`SCREEN_ONLY_RULES`](../lib/a11y-rules.ts) で、適合目標のタグでは走らないため
 * **axe を 2 度に分けて掛けます**。
 *
 * 開く画面は撮影と同じ一覧（[screens](../lib/screens.ts)）から採ります。
 *
 * **回すエンジンは 1 つです。** 見ているのは DOM の構造で、描画エンジンでは変わりません。
 * どのエンジンで回すかは `playwright.e2e.config.ts` が決めます。
 */

const screens = selectScreens(
  resolveScreens(listScreenRoutes(readFileSync(SCREEN_MANIFEST_FILE, "utf8")), SCREENS),
  process.env["E2E_ONLY"],
);

/**
 * 遷移とアニメーションを止める。
 *
 * @remarks
 * **色は遷移の途中にも存在します。** `transition-colors` を持つ部品が状態を変えると、変わり切る
 * までのあいだ前後のどちらでもない色が計算値として読めます。`color-contrast` はその値を測るため、
 * 止めずに掛けると**設計が持たない色**で落ちます。状態が動く画面ほど当たりやすく、同じ画面でも
 * 出たり出なかったりします。
 *
 * **撮影の側は Playwright が同じことを自前でやります。** 同じ画面を見る 2 つの検査が違う絵を見ない
 * よう、こちらは明示して揃えます。
 *
 * **DOM が静止するのは待ちません。** 受信の続く画面は書き換えが止まらず、止まるのを待てば必ず
 * 時間切れになります。止めるのは動きだけで、どの状態を測るかは待ち合わせ（`e2e/lib/screens.ts` の
 * `settled`）が決めます。
 */
async function freezeMotion(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `*, *::before, *::after {
      animation-delay: 0s !important;
      animation-duration: 0s !important;
      transition-delay: 0s !important;
      transition-duration: 0s !important;
    }`,
  });
}

for (const screen of screens) {
  test(screen.name, async ({ page, signIn }) => {
    if (screen.signedIn !== undefined) {
      await signIn(screen.signedIn);
    }

    await page.goto(screen.path);

    // 撮影と同じ待ち合わせを通す。待たずに評価すると、`Suspense` の fallback（skeleton）を
    // 画面として見てしまう。skeleton は landmark も見出しも持たないことが多く、**違反が出ない**
    // 方向へ倒れるので、偽陰性は結果からは判らない。
    if (screen.settled !== undefined) {
      await page.locator(screen.settled).first().waitFor({ state: "visible" });
    }

    await page.evaluate(() => document.fonts.ready);
    await freezeMotion(page);

    const disabled = screenDisabledRuleIds(screen.name);
    const conformance = await new AxeBuilder({ page })
      .withTags([...CONFORMANCE_TAGS])
      .disableRules(disabled)
      .analyze();
    const structural = await new AxeBuilder({ page })
      .withRules([...SCREEN_ONLY_RULES])
      .disableRules(disabled)
      .analyze();
    const violations = [...conformance.violations, ...structural.violations];

    // 件数ではなく違反そのものを並べる。どのルールがどの要素で落ちたかが出ないと、
    // 落ちた人は画面を開いて探し直すことになる。
    expect(
      violations.map((violation) => ({
        rule: violation.id,
        help: violation.help,
        nodes: violation.nodes.map((node) => node.target.join(" ")),
      })),
    ).toEqual([]);
  });
}
