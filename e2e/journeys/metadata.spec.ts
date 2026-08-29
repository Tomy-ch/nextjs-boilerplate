import { isNoindex, listRobotsDirectives } from "../lib/public-surface";
import { expect, test } from "../lib/test";

/**
 * 索引させない起動（`SITE_INDEXABLE` 未指定 = `off`）で、公開面が索引を断っていること
 * （`docs/rules.md` #63）。索引させる側は `make e2e-metadata` が別の build で確かめる
 * （`e2e/metadata/`）。両方が通ってはじめて、切り替えが設定で効いていると言える。
 */

/** 索引させない起動でも開ける画面。root の `noindex` を継ぐので、どの画面でもよい。 */
const ENTRY_PATH = "/";

test("索引させない起動では、robots.txt が全経路を断り、サイトマップを知らせない", async ({
  request,
}) => {
  const response = await request.get("/robots.txt");

  expect(response.status()).toBe(200);

  const text = await response.text();

  expect(listRobotsDirectives(text, "Disallow")).toEqual(["/"]);
  expect(listRobotsDirectives(text, "Sitemap")).toEqual([]);
});

test("索引させない起動では、画面が noindex を名乗る", async ({ request }) => {
  const response = await request.get(ENTRY_PATH);

  expect(response.status()).toBe(200);
  expect(isNoindex(await response.text())).toBe(true);
});
