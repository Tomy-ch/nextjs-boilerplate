import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { findBareVariables, formatBareVariables } from "./lib/shell-brace";

/**
 * シェル変数が全角文字の直前に裸で置かれていないかを見るゲート。
 *
 * @remarks
 * 検査の中身は {@link findBareVariables} が持ち、ここは走査範囲だけを担う（`doc-links.gate.test.ts`
 * と同形）。
 *
 * `shellcheck` では代替できない。あれが見るのは走らせた結果であって、この形は走っても落ちない。
 */

const REPOSITORY_ROOT = resolve(import.meta.dirname, "..");

/**
 * 走査する綴り。
 *
 * @remarks
 * シェルが直に読むもの（`*.sh`）と、recipe をシェルへ渡すもの（`Makefile` / `*.mk`）を見る。
 * workflow の `run:` は `actionlint` が別に見ている範囲なので、ここでは重ねない。
 */
const SCANNED = [".sh", ".mk"] as const;

/**
 * 走査対象の下限。
 *
 * @remarks
 * 走査対象が空へ縮退すると違反も 0 件になり、ゲートが「違反なし」を報告する向きに壊れたことを
 * 結果から見分けられない。実数より十分低く採る —— 守るのは縮退であって増減ではない。
 */
const MINIMUM_FILES = 20;

function tracked(): string[] {
  return execFileSync("git", ["ls-files"], { cwd: REPOSITORY_ROOT, encoding: "utf8" })
    .split("\n")
    .filter((path) => path === "Makefile" || SCANNED.some((suffix) => path.endsWith(suffix)));
}

describe("シェル変数の囲み", () => {
  // ----- 正常系 -----
  const files = tracked();

  it("走査が縮退していない", () => {
    expect(files.length).toBeGreaterThanOrEqual(MINIMUM_FILES);
  });

  it("全角文字の直前に裸で置かれた変数が無い", () => {
    const found = files.flatMap((file) =>
      findBareVariables(file, readFileSync(join(REPOSITORY_ROOT, file), "utf8")),
    );

    expect(formatBareVariables(found)).toBe("");
  });
});
