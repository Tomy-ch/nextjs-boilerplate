import { once } from "node:events";
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { test as base, expect, type Page } from "@playwright/test";
import { EXCLUDED_STORIES } from "./lib/excluded-stories";
import { createStaticServer } from "./lib/static-server";
import { excludeDeclared, parseStoryIndex, selectStories, storyURL } from "./lib/story-index";

/**
 * Storybook の全 story を基準画像と比べる。
 *
 * @remarks
 * 比較単位を story に取るのは、story が部品の在庫リストそのものであり、画面より安定した
 * 単位になるためです([0091](../docs/adr/0091-test-verification-methods.md))。退行の主因は
 * 画面ごとの個別変更ではなく、design token や layout を触って全画面が動くことなので、
 * それを部品の側で捕まえます。
 */

/** 撮影対象。`pnpm build-storybook` の出力先。 */
const STORYBOOK_DIR = "storybook-static";

const stories = selectStories(
  excludeDeclared(
    parseStoryIndex(readFileSync(`${STORYBOOK_DIR}/index.json`, "utf8")),
    EXCLUDED_STORIES,
  ),
  process.env.VRT_ONLY,
);

// 配信は worker ごとにポートを OS へ選ばせて立てる。単一のサーバを外から与えると、
// 並列数とポートの空きがリポジトリの設定として固定され、worktree を並べた分だけ衝突する。
const test = base.extend<Record<never, never>, { storybookURL: string }>({
  storybookURL: [
    // 第 1 引数は空の分割代入でなければならない。Playwright はここに並べた名前を
    // この fixture の依存として読むため、名前付きの引数にすると解釈できない。
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
  // story の id を注記として残す。承認経路は落ちた story を id で絞るため、見出しの文字列から
  // 逆引きせずに済ませる。
  const details = { annotation: { type: "story", description: story.id } };

  test(`${story.title} / ${story.name}`, details, async ({ page }, testInfo) => {
    const crashes: Error[] = [];
    page.on("pageerror", (error) => crashes.push(error));

    await page.goto(storyURL(story.id, testInfo.project.name));
    await settle(page, testInfo.project.name);

    // 描画中に投げた例外は、画像が撮れてしまうぶん差分に出ないことがある。壊れた story を
    // 「見た目が変わっていない」で通さないため、画像より先に見る。
    expect(crashes.map((crash) => crash.message)).toEqual([]);

    await expect(page).toHaveScreenshot(`${story.id}.png`);
  });
}

// 撮影前に、描画とフォントの読み込みが終わるのを待つ。
//
// 描画の完了は配色テーマが `:root` へ乗ったことで見る。テーマを載せるのが story を包む
// decorator（`.storybook/preview.ts`）なので、乗っていれば story まで到達している。要素の
// 出現で見ると、描画前の空の `#storybook-root` を「安定した画面」として撮ってしまう。
//
// フォントは差し替わった瞬間に字形が変わるため、待たずに撮ると同じ story が撮るたびに
// 違う画像になる。
async function settle(page: Page, theme: string): Promise<void> {
  await page.waitForFunction(
    (expected) => document.documentElement.dataset.theme === expected,
    theme,
  );
  await page.evaluate(() => document.fonts.ready);
}
