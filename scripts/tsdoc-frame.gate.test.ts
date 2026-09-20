import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { findMissingFrames, formatMissingFrames } from "./lib/tsdoc-frame";

/**
 * 名前の付いた関数が TSDoc の枠を持っているかを見るゲート。
 *
 * @remarks
 * 検査の中身は {@link findMissingFrames} が持ち、ここは走査範囲だけを担う（`doc-links.gate.test.ts`
 * と同形）。
 *
 * biome も ESLint も doc comment の有無を要求しない。枠は呼び出し地点の hover へ出る成果物で、
 * 欠けていても何も落ちないため、綴りのほうを見ている。
 */

const REPOSITORY_ROOT = resolve(import.meta.dirname, "..");

/** 走査する綴り。 */
const SCANNED = /\.tsx?$/;

/**
 * 走査対象の下限。
 *
 * @remarks
 * 走査対象が空へ縮退すると欠けも 0 件になり、ゲートが「違反なし」を報告する向きに壊れたことを
 * 結果から見分けられない。実数より十分低く採る —— 守るのは縮退であって増減ではない。
 */
const MINIMUM_FILES = 300;

function sources(): string[] {
  return execFileSync("git", ["ls-files", "src"], { cwd: REPOSITORY_ROOT, encoding: "utf8" })
    .split("\n")
    .filter((path) => SCANNED.test(path))
    .filter((path) => existsSync(join(REPOSITORY_ROOT, path)));
}

describe("TSDoc の枠", () => {
  // ----- 正常系 -----
  const files = sources();

  it("走査が縮退していない", () => {
    expect(files.length).toBeGreaterThanOrEqual(MINIMUM_FILES);
  });

  it("枠を欠いた名前の付いた関数が無い", () => {
    const found = files.flatMap((file) =>
      findMissingFrames(file, readFileSync(join(REPOSITORY_ROOT, file), "utf8")),
    );

    expect(formatMissingFrames(found)).toBe("");
  });
});
