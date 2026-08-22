import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  findUnresolvedAssets,
  formatUnresolvedAssets,
  parseStaticDirs,
} from "./lib/catalog-assets";

/**
 * ソースが指す資材の URL が、配信の根で解決するかを見るゲート。
 *
 * @remarks
 * 検査の中身は `lib/catalog-assets.ts` が持ち、ここはツリーの走査だけを担う
 * （`doc-links.gate.test.ts` と同形）。
 *
 * **指し先の無い URL は何も落とさない。** カタログは壊れた絵をそのまま描き、VRT はそれを
 * 基準画像として承認する。以後は差分が出ないので、見直す機会も来ない。
 */

const REPOSITORY_ROOT = resolve(import.meta.dirname, "..");

/** 走査する範囲（リポジトリルート相対）。ここに並ばないディレクトリは丸ごと無検査になる。 */
const SCAN_ROOTS = ["src", ".storybook"] as const;

/** 走査しない名前。生成物と依存は書き手の手が入らない。 */
const SKIPPED_DIRECTORIES = new Set(["node_modules", "gen"]);

/** 走査対象の拡張子。 */
const SOURCE_PATTERN = /\.tsx?$/;

/**
 * テストは走査しない。
 *
 * @remarks
 * props へ渡すだけの URL を並べる場所で、指し先が実在しないのが正しい。ブラウザが取りに
 * 行かないため、実在させても確かめられることは増えない。
 */
const TEST_PATTERN = /\.test\.tsx?$/;

function* walk(directory: string): Generator<string> {
  for (const entry of readdirSync(directory)) {
    const absolute = join(directory, entry);

    if (statSync(absolute).isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(entry)) yield* walk(absolute);
      continue;
    }

    if (SOURCE_PATTERN.test(entry) && !TEST_PATTERN.test(entry)) yield absolute;
  }
}

// リポジトリ全体を走査するため、既定の 5 秒では足りない
// （`docs/testing-conventions.md`「リポジトリ全体を走査するゲート」）。
const TIMEOUT_MS = 300_000;

describe("カタログ資材の解決", () => {
  it(
    "ソースが指す資材の URL は、そのファイルが見る配信の根で解決する",
    () => {
      const catalogRoots = parseStaticDirs(
        readFileSync(join(REPOSITORY_ROOT, ".storybook/main.ts"), "utf8"),
      );

      const unresolved = SCAN_ROOTS.flatMap((root) =>
        [...walk(join(REPOSITORY_ROOT, root))].flatMap((file) =>
          findUnresolvedAssets(
            relative(REPOSITORY_ROOT, file),
            readFileSync(file, "utf8"),
            REPOSITORY_ROOT,
            catalogRoots,
          ),
        ),
      );

      expect(formatUnresolvedAssets(unresolved)).toBe("");
    },
    TIMEOUT_MS,
  );
});
