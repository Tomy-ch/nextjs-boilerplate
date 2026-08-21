import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { findExclusionDrift } from "./lib/coverage-exclusion";
import { EXCLUDED_FROM_CHECKS } from "./lib/untested-modules";

/**
 * カバレッジ除外が、所有側の README にも記録されているかのゲート。
 *
 * @remarks
 * 検査の中身は `lib/coverage-exclusion.ts` が持ち、ここはファイルの読み取りだけを担う
 * (`test-requirement.gate.test.ts` と同形)。
 *
 * 除外の正は `lib/untested-modules.ts` の宣言 1 箇所で、README が持つのは「この配下に検査の穴が
 * ある」という記録だけである([0090](../docs/adr/0090-testing-strategy.md))。記録が無いと、その層を
 * 読む人は自分のディレクトリに穴があることに気づけない —— 除外は `scripts/lib/` を開いた人にしか
 * 見えないものになる。
 *
 * **ゲートが見るのは記録の有無だけで、承認は見ない。** 除外を増やしてよいかの判断は PR の
 * レビューに残る（同 ADR「README 記録・承認なしに増やすこと」の禁止）。機械が代われるのは
 * 「書いてあるか」までである。
 */

const REPOSITORY_ROOT = resolve(import.meta.dirname, "..");

function readReadme(directory: string): string | null {
  const path = join(REPOSITORY_ROOT, directory, "README.md");

  return existsSync(path) ? readFileSync(path, "utf8") : null;
}

describe("カバレッジ除外の記録", () => {
  it("除外は所有 README の記録と一致する", () => {
    // 宣言が空振りすると、違反ゼロを報告したままゲートが黙る。宣言の列を組み替えたときに起きる
    // 壊れ方がこれなので、違反より先に「見た件数」を主張する。
    expect(EXCLUDED_FROM_CHECKS.length).toBeGreaterThan(0);
    expect(findExclusionDrift([...EXCLUDED_FROM_CHECKS], readReadme)).toEqual([]);
  });
});
