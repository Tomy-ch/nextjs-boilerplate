import { readFileSync } from "node:fs";

import AxeBuilder from "@axe-core/playwright";

import { CONFORMANCE_TAGS, screenDisabledRuleIds } from "../lib/a11y-rules";
import { ENGINES } from "../lib/browsers";
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
 * 開く画面は撮影と同じ一覧（[screens](../lib/screens.ts)）から採ります。手で持つと、新しく
 * 足した画面が黙って対象外のまま残ります。
 */

const screens = selectScreens(
  resolveScreens(listScreenRoutes(readFileSync(SCREEN_MANIFEST_FILE, "utf8")), SCREENS),
  process.env.E2E_ONLY,
);

for (const screen of screens) {
  test(screen.name, async ({ page, signIn }, testInfo) => {
    // 見ているのは DOM の構造で、描画エンジンでは変わらない。3 つで回すと同じ違反が 3 回並ぶ。
    // ジャーニーが 3 つのエンジンを要るのは、エンジンごとに挙動が違うものを見ているためである。
    test.skip(testInfo.project.name !== ENGINES[0], "構造の検査はエンジンを 1 つ選んで回す");

    if (screen.signedIn !== undefined) {
      await signIn(screen.signedIn);
    }

    await page.goto(screen.path);

    const { violations } = await new AxeBuilder({ page })
      .withTags([...CONFORMANCE_TAGS])
      .disableRules(screenDisabledRuleIds(screen.name))
      .analyze();

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
