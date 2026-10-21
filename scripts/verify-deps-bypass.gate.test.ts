import { readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * pnpm の依存検査を外して起動するターゲットが、その前提を保っているかを見るゲート。
 *
 * @remarks
 * `verifyDepsBeforeRun`（`pnpm-workspace.yaml`）は、依存の実体が lockfile と食い違ったまま
 * スクリプトが走ることを止める。**外してよい理由は「node_modules から何も引かない」ことだけ**で、
 * 依存を 1 つでも引いた時点でその前提は崩れる —— それでも答えは返り続けるので、崩れたことは
 * 誰にも見えない。
 *
 * import とレシピの宣言を両方見るのは、片方だけでは「守る対象を失った検査が緑を返す」状態と
 * 区別が付かないためである。
 */

const SCRIPTS_ROOT = import.meta.dirname;
const RECIPE = resolve(SCRIPTS_ROOT, "../.makefiles/github/operation/release-branch.mk");

/** 検査を外して起動する入口。レシピの `pnpm --config.verify-deps-before-run=false` と対になる。 */
const ENTRY_POINTS = ["base-branch/index.ts", "base-merge/index.ts"] as const;

const IMPORT_PATTERNS = [
  /(?:import|export)\b[^;]*?\bfrom\s*["']([^"']+)["']/g,
  /\bimport\s*["']([^"']+)["']/g,
  /\bimport\s*\(\s*["']([^"']+)["']/g,
];

function importSpecifiersOf(source: string): string[] {
  return IMPORT_PATTERNS.flatMap((pattern) =>
    [...source.matchAll(pattern)].map(([, specifier]) => specifier ?? ""),
  ).filter((specifier) => specifier !== "");
}

/** 入口から辿れる範囲で、node 組み込みでもリポジトリ内でもない import を集める。 */
function externalImportsOf(entry: string): string[] {
  const visited = new Set<string>();
  const external: string[] = [];
  const queue = [resolve(SCRIPTS_ROOT, entry)];

  while (queue.length > 0) {
    const file = queue.pop();
    if (file === undefined || visited.has(file)) continue;
    visited.add(file);

    for (const specifier of importSpecifiersOf(readFileSync(file, "utf8"))) {
      if (specifier.startsWith("node:")) continue;
      if (!specifier.startsWith(".")) {
        external.push(`${relative(SCRIPTS_ROOT, file)} → ${specifier}`);
        continue;
      }
      // ESM の綴りは `.js` だが、実体は同名の `.ts` である。
      queue.push(resolve(dirname(file), specifier.replace(/\.js$/, ".ts")));
    }
  }

  return external;
}

describe("依存検査を外して起動するターゲット", () => {
  it.each(ENTRY_POINTS)("%s は node 組み込みとリポジトリ内のモジュールしか引かない", (entry) => {
    expect(externalImportsOf(entry)).toEqual([]);
  });

  it.each(ENTRY_POINTS)("%s のレシピが検査を外して起動している", (entry) => {
    const target = entry.replace("/index.ts", "");
    const recipe = readFileSync(RECIPE, "utf8");

    expect(recipe).toContain(
      `@pnpm --config.verify-deps-before-run=false exec tsx scripts/${target}`,
    );
  });
});
