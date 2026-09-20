import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { collectRuleTally, renderRuleTally, replaceGeneratedBlock } from "./rules-tally/tally";

/**
 * トレーサビリティの規約の集計が、実装規約と一致しているかを見るゲート。
 *
 * @remarks
 * 集計の中身は {@link collectRuleTally} が持ち、ここは 2 つの文書を読んで突き合わせるだけを担う。
 *
 * 手で数えた件数を置かない決定に対を付けるのがこのゲートである
 * （[scripts](README.md)「関連する ADR」）。**陳腐化に人が気付く必要が無い**ことが狙いなので、
 * ここが緑であることが集計の現在性そのものになる。
 */

const ROOT = resolve(import.meta.dirname, "..");

/**
 * 走査対象の下限。
 *
 * @remarks
 * 規約が 0 件へ縮退すると、集計も 0 件で一致し、ゲートが「違反なし」を報告する向きに壊れたことを
 * 結果から見分けられない。実数より十分低く採る —— 守るのは縮退であって増減ではない。
 */
const MINIMUM_RULES = 100;
const MINIMUM_SECTIONS = 10;

describe("実装規約の集計", () => {
  const tally = collectRuleTally(readFileSync(resolve(ROOT, "docs/rules.md"), "utf8"));

  it("数えられなかったものが無い", () => {
    expect(tally.violations).toEqual([]);
  });

  it("走査が縮退していない", () => {
    expect(tally.rules).toBeGreaterThanOrEqual(MINIMUM_RULES);
    expect(tally.sections).toBeGreaterThanOrEqual(MINIMUM_SECTIONS);
  });

  it("トレーサビリティの生成ブロックが、いまの実装規約と一致する", () => {
    const traceability = readFileSync(resolve(ROOT, "docs/traceability.md"), "utf8");

    expect(traceability).toBe(replaceGeneratedBlock(traceability, renderRuleTally(tally)));
  });
});
