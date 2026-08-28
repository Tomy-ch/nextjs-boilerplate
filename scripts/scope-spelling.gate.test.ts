import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  findUnspelledScopes,
  formatUnspelledScopes,
  type ScopeDeclaringModule,
} from "./lib/scope-spelling";

/**
 * 取得の口が分類を綴りのまま宣言しているかのゲート。
 *
 * @remarks
 * 判定の中身は `lib/scope-spelling.ts` が持ち、ここはツリーの走査だけを担う
 * （`server-only.gate.test.ts` と同形）。
 *
 * **lint の段は綴りを読んでいる。** 宣言を定数へ寄せた変更は型検査も lint も通り、そのぶん
 * `use cache` の下から user-scoped な口を引く検査だけが黙って外れる。外れたことが見えないので、
 * 前提が生きていること自体をここで見張る。
 */

const REPOSITORY_ROOT = resolve(import.meta.dirname, "..");
const SOURCE_ROOT = join(REPOSITORY_ROOT, "src");

/** 走査から外す。テストは束に載らない。 */
const EXCLUDED = /\.test\.tsx?$/;

function collect(directory: string, into: ScopeDeclaringModule[]): ScopeDeclaringModule[] {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      collect(path, into);
      continue;
    }

    if (/\.tsx?$/.test(path) && !EXCLUDED.test(path)) {
      into.push({ path: relative(REPOSITORY_ROOT, path), content: readFileSync(path, "utf8") });
    }
  }

  return into;
}

describe("取得の口の分類の綴り", () => {
  // ----- 正常系 -----
  it("口を作るモジュールは分類を綴りのまま宣言している", () => {
    const modules = collect(SOURCE_ROOT, []);

    // 走査が空振りすると、違反ゼロを報告したままゲートが黙る。違反より先に「見た件数」を主張する。
    expect(modules.filter(({ content }) => content.includes("createHttpClient(")).length).toBeGreaterThan(0);
    expect(formatUnspelledScopes(findUnspelledScopes(modules))).toBe("");
  });
});
