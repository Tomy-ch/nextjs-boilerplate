import { once } from "node:events";
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { test as base, expect, type Page } from "@playwright/test";
import { EXCLUDED_STORIES } from "./lib/excluded-stories";
import { settle } from "./lib/settle";
import { createStaticServer } from "./lib/static-server";
import { excludeDeclared, parseStoryIndex, storyURL } from "./lib/story-index";
import { semanticColorTokens, type TokenReadings } from "./lib/theme-tokens";

/**
 * 配色テーマが面へ効いていることを、テーマごとに見る。
 *
 * @remarks
 * 全 story を撮り axe を掛けるのは片方のテーマだけです([themes](lib/themes.ts))。ここが埋めるのは、
 * それによって空く 1 点 —— **撮らない側のテーマの適用経路だけが壊れる**場合です。
 *
 * ほかの壊れ方は既に別の検査が持っています。SSOT と生成物のずれは `tokens-drift` が、生成物が
 * そもそも読まれない状態は撮る側のテーマの全 story 撮影が捕まえます。ここで値そのものを持つと、
 * 同じ表を 2 箇所に持つことになります。
 */

const STORYBOOK_DIR = "storybook-static";
const TOKENS_CSS = "src/app/generated/tokens.css";

const TOKENS = semanticColorTokens(readFileSync(TOKENS_CSS, "utf8"));

// どの story でもよい。見るのは story の中身ではなく、story を包む面に配色が乗っているか。
const [PROBE_STORY] = excludeDeclared(
  parseStoryIndex(readFileSync(`${STORYBOOK_DIR}/index.json`, "utf8")),
  EXCLUDED_STORIES,
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

/**
 * 意味トークンを、継承する色が違う 2 つの面で読む。
 *
 * 変数の宣言ではなく変数を使った結果を読むのは、宣言のまま読むと `var(...)` が解決前の文字列で
 * 返る browser があるため。2 面で読む理由は {@link unresolvedTokens} にある。
 */
async function readTokens(
  page: Page,
  names: readonly string[],
): Promise<Record<string, TokenReadings>> {
  return page.evaluate((tokens) => {
    const parents = ["rgb(1, 2, 3)", "rgb(4, 5, 6)"].map((inherited) => {
      const parent = document.createElement("div");
      parent.style.color = inherited;
      parent.append(document.createElement("div"));
      document.body.append(parent);

      return parent;
    });

    const readings: Record<string, [string, string]> = {};
    for (const token of tokens) {
      const [first, second] = parents.map((parent) => {
        const probe = parent.firstElementChild as HTMLElement;
        probe.style.color = `var(${token})`;

        return getComputedStyle(probe).color;
      });
      readings[token] = [first as string, second as string];
    }
    for (const parent of parents) parent.remove();

    return readings;
  }, names);
}

test.describe("配色トークン", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    if (PROBE_STORY === undefined) throw new Error("撮影対象が 1 つもありません");
    await page.goto(storyURL(PROBE_STORY.id, testInfo.project.name));
    await settle(page, testInfo.project.name);
  });

  // ----- 正常系 -----
  test("面の明暗が配色テーマと一致する", async ({ page }, testInfo) => {
    const scheme = await page.evaluate(
      () => getComputedStyle(document.documentElement).colorScheme,
    );

    expect(scheme).toBe(testInfo.project.name);
  });

  test("もう一方のテーマとは違う配色になる", async ({ page }, testInfo) => {
    const own = await readTokens(page, TOKENS);
    await page.evaluate(
      (theme) => document.documentElement.setAttribute("data-theme", theme),
      testInfo.project.name === "dark" ? "light" : "dark",
    );
    const other = await readTokens(page, TOKENS);

    // 全部が違う必要はない。両テーブルが丸ごと同じなら、テーマの切り替えが効いていない。
    expect(other, "テーマを切り替えても配色が変わりません").not.toEqual(own);
  });
});
