import { once } from "node:events";
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { test as base, expect, type Page, type TestInfo } from "@playwright/test";
import { installFixedClock } from "./lib/clock";
import { EXCLUDED_STORIES } from "./lib/excluded-stories";
import {
  BASELINE_TAG,
  expectedBaselines,
  listBaselines,
  missingBaselines,
  orphanBaselines,
} from "./lib/orphan-baselines";
import { createStaticServer } from "./lib/static-server";
import { excludeDeclared, parseStoryIndex, selectStories, storyURL } from "./lib/story-index";

/**
 * Storybook の全 story を基準画像と比べる。
 *
 * @remarks
 * 比較単位を story に取る理由は [README](README.md) と
 * [0091](../docs/adr/0091-test-verification-methods.md) §3 にあります。
 */

/** 撮影対象。`pnpm build-storybook` の出力先。 */
const STORYBOOK_DIR = "storybook-static";

const shootable = excludeDeclared(
  parseStoryIndex(readFileSync(`${STORYBOOK_DIR}/index.json`, "utf8")),
  EXCLUDED_STORIES,
);

const stories = selectStories(shootable, process.env.VRT_ONLY);

// ポートは OS に選ばせる。固定のポートで単一のサーバを外から与えると、worktree を並べた分だけ
// 衝突する。
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

    // 時計はページを開く前に固定する。
    await installFixedClock(page);
    await page.goto(storyURL(story.id, testInfo.project.name));
    await settle(page, testInfo.project.name);

    // 描画中に投げた例外は、画像が撮れてしまうぶん差分に出ないことがある。壊れた story を
    // 「見た目が変わっていない」で通さないため、画像より先に見る。
    expect(crashes.map((crash) => crash.message)).toEqual([]);

    // 配列で渡す。1 本の文字列にすると Playwright が `/` をファイル名として無害化するので、
    // 系統ごとに分かれず 1 階層へ平置きされる。
    await expect(page).toHaveScreenshot([story.group, testInfo.project.name, `${story.id}.png`]);
  });
}

// 撮影対象と基準画像の対応。範囲を絞った実行(`VRT_ONLY`)では、対象外の story の画像と孤児を
// 区別できないため見ない。比較を省いた実行でもここだけは走る(`make vrt`)。
if (!process.env.VRT_ONLY) {
  test("基準画像 / 撮影対象と 1 対 1 で対応する", { tag: BASELINE_TAG }, ({}, testInfo) => {
    const present = listBaselines(baselineRoot(testInfo));
    const expected = expectedBaselines(shootable);

    expect(
      orphanBaselines(present, expected),
      "撮り直して置き場へ送るか、対応する story を戻してください",
    ).toEqual([]);
    expect(missingBaselines(present, expected), "make vrt-retake で撮り直してください").toEqual([]);
  });
}

// 置き場の位置は `playwright.config.ts` の `snapshotPathTemplate` が決める。撮影と同じ解決を
// 通してから 3 区画(系統 / テーマ / ファイル名)ぶん遡る。
function baselineRoot(testInfo: TestInfo): string {
  return path.resolve(testInfo.snapshotPath("group", "theme", "story.png"), "../../..");
}

// 撮影前に、描画とフォントの読み込みが終わるのを待つ。
//
// 描画の完了は配色テーマが `:root` へ乗ったことで見る。テーマを載せるのが story を包む
// decorator(`.storybook/preview.ts`)なので、乗っていれば story まで到達している。要素の出現で
// 見ると、描画前の空の `#storybook-root` を「安定した画面」として撮ってしまう。
async function settle(page: Page, theme: string): Promise<void> {
  await page.waitForFunction(
    (expected) => document.documentElement.dataset.theme === expected,
    theme,
  );
  await page.evaluate(() => document.fonts.ready);
}
