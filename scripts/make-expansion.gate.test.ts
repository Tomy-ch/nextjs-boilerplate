import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { assignedNames, findBareExpansions, formatBareExpansions } from "./lib/make-expansion";

/**
 * 外から来る値が make の変数として recipe 行へ展開されていないかを見るゲート。
 *
 * @remarks
 * 検査の中身は {@link findBareExpansions} が持ち、ここは走査範囲だけを担う（`doc-links.gate.test.ts`
 * と同形）。
 *
 * `make actions-shellcheck` が見るのは composite action の `run:`、`make shellcheck` が見るのは
 * 追跡下の `*.sh` で、**どちらも `.mk` の recipe を読まない**。
 */

const REPOSITORY_ROOT = resolve(import.meta.dirname, "..");

/** 走査する綴り。recipe を持つのはこの 2 つだけ。 */
const SCANNED = /\.mk$/;

/**
 * 走査対象の下限。
 *
 * @remarks
 * 走査対象が空へ縮退すると違反も 0 件になり、ゲートが「違反なし」を報告する向きに壊れたことを
 * 結果から見分けられない。実数より十分低く採る —— 守るのは縮退であって増減ではない。
 */
const MINIMUM_FILES = 20;

function recipes(): string[] {
  return execFileSync("git", ["ls-files"], { cwd: REPOSITORY_ROOT, encoding: "utf8" })
    .split("\n")
    .filter((path) => path === "Makefile" || SCANNED.test(path))
    .filter((path) => existsSync(join(REPOSITORY_ROOT, path)));
}

describe("make の変数展開", () => {
  // ----- 正常系 -----
  const files = recipes();
  const sources = files.map((file) => readFileSync(join(REPOSITORY_ROOT, file), "utf8"));

  it("走査が縮退していない", () => {
    expect(files.length).toBeGreaterThanOrEqual(MINIMUM_FILES);
  });

  it("外から来る値を recipe 行へ展開していない", () => {
    const assigned = assignedNames(sources);
    const found = files.flatMap((file, index) =>
      findBareExpansions(file, sources[index] ?? "", assigned),
    );

    expect(formatBareExpansions(found)).toBe("");
  });
});
