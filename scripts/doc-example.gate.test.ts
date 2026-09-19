import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { findDocTags } from "./lib/doc-comment";

/**
 * doc comment が `@example` を持たないことを見るゲート。
 *
 * @remarks
 * 実行されない例はコードの形をした散文で、実装が動いたあとも自分だけ古いまま残る
 * （`docs/rules.md`「コメントと文書」）。部品の例は Storybook が正本で、doc comment は `@see` で
 * そこを指す。**`@example` は評価者を持たないまま、コードとして読まれる形をしている**ので、
 * LLM に対しては最も強い誤誘導になる。
 *
 * 検査の中身は {@link findDocTags} が持ち、ここはツリーの走査だけを担う
 * （`doc-links.gate.test.ts` と同形）。
 *
 * **走査した件数そのものを主張する。** 走査が 0 件へ落ちても「違反なし」は成立してしまうので、
 * 件数を見ないと検査が空回りしたことに気づけない（[README](README.md)）。
 */

const REPOSITORY_ROOT = resolve(import.meta.dirname, "..");

/** 走査する範囲（リポジトリルート相対）。 */
const SCAN_ROOT = "src";

/** 走査しない名前。生成物には書き手の手が入らない。 */
const SKIPPED_DIRECTORIES = new Set(["node_modules", "gen"]);

/** 走査対象の拡張子。 */
const SOURCE_PATTERN = /\.tsx?$/;

/**
 * 走査が空回りしていないことを主張する下限。
 *
 * @remarks
 * 実測より十分低く、かつ「走査が壊れた」を捕まえられる値に置く。ツリーが縮んでこれを割るなら、
 * 下げる前に何が消えたのかを見る。
 */
const MINIMUM_SOURCES = 500;

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

// 既定の 5 秒はテスト 1 件を想定した値で、ツリー全体を歩く走査の分を含まない。全量を並列で
// 回すと取り合いでさらに伸び、判定は正しいのに落ちる（docs/testing-conventions.md）。
const TIMEOUT_MS = 120_000;

/** `@example` を持つ箇所を、`パス:行` の並びで返す。 */
function examplesIn(files: readonly string[]): string[] {
  return files.flatMap((file) =>
    findDocTags(readFileSync(join(REPOSITORY_ROOT, file), "utf8"), "example").map(
      ({ line }) => `${file}:${line}`,
    ),
  );
}

describe("doc comment の @example", () => {
  // ----- 異常系 -----
  it(
    "`src/` の doc comment は `@example` を持たない",
    () => {
      const files = [...walk(join(REPOSITORY_ROOT, SCAN_ROOT))].map((file) =>
        relative(REPOSITORY_ROOT, file),
      );

      expect(files.length).toBeGreaterThan(MINIMUM_SOURCES);
      expect(examplesIn(files)).toEqual([]);
    },
    TIMEOUT_MS,
  );
});
