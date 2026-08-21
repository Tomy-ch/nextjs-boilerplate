import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { findBrokenDocLinks, formatBrokenDocLinks } from "./lib/doc-links";

/**
 * ソースの中から文書を指す相対リンクが、実在するかを見るゲート。
 *
 * @remarks
 * 検査の中身は `lib/doc-links.ts` が持ち、ここはツリーの走査だけを担う。ゲートを `scripts/` へ
 * 置くのは、これがアプリの振る舞いではなく開発機構の検査だから（`one-to-one.gate.test.ts` と同形）。
 *
 * **段数を手で書く相対パスは、ファイルを動かした時点で静かに切れる。**型検査も lint も文字列の
 * 中までは見ないため、壊れても何も落ちず、読む人が辿って初めて気づく。
 */

const REPOSITORY_ROOT = resolve(import.meta.dirname, "..");

/** 走査する範囲（リポジトリルート相対）。ここに並ばないディレクトリは丸ごと無検査になる。 */
const SCAN_ROOTS = [
  "src",
  "scripts",
  "tokens",
  "mocks",
  "docs-viewer/src",
  "eslint-rules",
  "baseline/lib",
  "vrt",
  "e2e",
  ".storybook/lib",
] as const;

/** 走査しない名前。生成物と依存は書き手の手が入らない。 */
const SKIPPED_DIRECTORIES = new Set(["node_modules", "gen", "__mocks__"]);

/** 走査対象の拡張子。 */
const SOURCE_PATTERN = /\.tsx?$/;

function* walk(directory: string): Generator<string> {
  for (const entry of readdirSync(directory)) {
    const absolute = join(directory, entry);

    if (statSync(absolute).isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(entry)) yield* walk(absolute);
      continue;
    }

    if (SOURCE_PATTERN.test(entry)) yield absolute;
  }
}

// リポジトリ全体を走査するため、既定の 5 秒では足りない。全量を並列で回すと取り合いでさらに伸び、
// 走査の遅さがそのまま赤になる（`docs/testing-conventions.md`「リポジトリ全体を走査するゲート」）。
const TIMEOUT_MS = 300_000;

describe("文書リンクの解決", () => {
  it(
    "ソースの中から文書を指す相対リンクは、すべて実在する",
    () => {
      const broken = SCAN_ROOTS.flatMap((root) => {
        const absolute = join(REPOSITORY_ROOT, root);

        return [...walk(absolute)].flatMap((file) => {
          const inRepository = relative(REPOSITORY_ROOT, file);

          return findBrokenDocLinks(inRepository, readFileSync(file, "utf8"), REPOSITORY_ROOT);
        });
      });

      expect(formatBrokenDocLinks(broken, REPOSITORY_ROOT)).toBe("");
    },
    TIMEOUT_MS,
  );
});
