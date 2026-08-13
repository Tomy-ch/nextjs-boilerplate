import { once } from "node:events";
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import AxeBuilder from "@axe-core/playwright";
import { test as base, expect } from "@playwright/test";
import { disabledRuleIds } from "./lib/a11y-rules";
import { EXCLUDED_STORIES } from "./lib/excluded-stories";
import { settle } from "./lib/settle";
import { createStaticServer } from "./lib/static-server";
import { excludeDeclared, parseStoryIndex, selectStories, storyURL } from "./lib/story-index";

/**
 * Storybook の全 story に axe を掛ける。
 *
 * @remarks
 * ADR [0054](../docs/adr/0054-ui-catalog-storybook.md) の「a11y の自動検査を story に効かせる」を、
 * 追加のランナーを入れずに満たすための経路です（[0091](../docs/adr/0091-test-verification-methods.md) §3）。
 * 撮影と同じコンテナ・同じ story 列挙を使い、実ブラウザで検査します。
 *
 * **実ブラウザであることが本質**です。component テストの `vitest-axe` は jsdom で走るため
 * 色コントラストを検査できず、実際に無効化されています。ここは light / dark の両方を実描画
 * するので、テーマの切り替えでしか出ない contrast の違反まで届きます。
 *
 * spec を撮影と分けてあるのは、a11y の失敗が VRT の報告へ混ざると、撮り直しの経路がそれを
 * 撮り直そうとするためです。撮り直しても a11y は直らず、基準画像だけが承認済みになります。
 */

const STORYBOOK_DIR = "storybook-static";

const stories = selectStories(
  excludeDeclared(
    parseStoryIndex(readFileSync(`${STORYBOOK_DIR}/index.json`, "utf8")),
    EXCLUDED_STORIES,
  ),
  process.env.VRT_ONLY,
);

const test = base.extend<Record<never, never>, { storybookURL: string }>({
  storybookURL: [
    async ({}, use) => {
      const server = createStaticServer(STORYBOOK_DIR).listen(0, "127.0.0.1");
      await once(server, "listening");
      const { port } = server.address() as AddressInfo;

      await use(`http://127.0.0.1:${port}`);

      server.close();
    },
    { scope: "worker" },
  ],
  baseURL: async ({ storybookURL }, use) => {
    await use(storybookURL);
  },
});

for (const story of stories) {
  const details = { annotation: { type: "story", description: story.id } };

  test(`${story.title} / ${story.name}`, details, async ({ page }, testInfo) => {
    await page.goto(storyURL(story.id, testInfo.project.name));
    await settle(page, testInfo.project.name);

    const { violations } = await new AxeBuilder({ page })
      .disableRules(disabledRuleIds(story.id))
      .analyze();

    // 件数ではなく違反そのものを並べる。どのルールがどの要素で落ちたかが出ないと、
    // 落ちた人は Storybook を開いて探し直すことになる。
    expect(
      violations.map((violation) => ({
        rule: violation.id,
        help: violation.help,
        nodes: violation.nodes.map((node) => node.target.join(" ")),
      })),
    ).toEqual([]);
  });
}
