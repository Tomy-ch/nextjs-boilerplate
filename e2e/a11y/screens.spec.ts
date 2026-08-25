import { readFileSync } from "node:fs";

import AxeBuilder from "@axe-core/playwright";

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
 * story 単位の検査（`vrt/a11y.spec.ts`）とは**見られる層が違います**。あちらは部品を単独で描く
 * ので、内容を包む landmark も `main` も h1 も持てず、その 3 つは全 story から外れています。
 * ここは部品を組み上げた画面を開くため、**組み上げてはじめて壊れる**それらが見られます
 * （[e2e/lib/a11y-rules.ts](../lib/a11y-rules.ts) の `SCREEN_ONLY_RULES`）。
 *
 * 配信される document も同じです。story は Storybook の iframe document の中で描かれるため、
 * `html-has-lang` / `document-title` が評価しているのは Storybook の器であって
 * `src/app/layout.tsx` ではありません。ここで開くのは実際に配信される document です。
 *
 * **axe を 2 度かけます。** 適合目標はタグで宣言するのが正ですが、landmark と h1 の 3 ルールは
 * axe では `best-practice` タグしか持たず、タグ集合に入りません。タグの側へ `best-practice` を
 * 足すと目標に無い水準まで全画面へ課すことになるので、**その 3 つだけを規則名で名指しして
 * 別に走らせます**。
 *
 * 開く画面は撮影と同じ一覧（[screens](../lib/screens.ts)）から採ります。手で持つと、新しく
 * 足した画面が黙って対象外のまま残ります。
 *
 * **回すエンジンは 1 つです。** 見ているのは DOM の構造で、描画エンジンでは変わりません。
 * どのエンジンで回すかは `playwright.e2e.config.ts` が決めます。
 */

const screens = selectScreens(
  resolveScreens(listScreenRoutes(readFileSync(SCREEN_MANIFEST_FILE, "utf8")), SCREENS),
  process.env.E2E_ONLY,
);

for (const screen of screens) {
  test(screen.name, async ({ page, signIn }) => {
    if (screen.signedIn !== undefined) {
      await signIn(screen.signedIn);
    }

    await page.goto(screen.path);
    // 撮影と同じ待ち合わせを通す。待たずに評価すると、`Suspense` の fallback（skeleton）を
    // 画面として見てしまう。skeleton は landmark も見出しも持たないことが多く、**違反が出ない**
    // 方向へ倒れるので、偽陰性は結果からは判らない。
    await page.evaluate(() => document.fonts.ready);

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
