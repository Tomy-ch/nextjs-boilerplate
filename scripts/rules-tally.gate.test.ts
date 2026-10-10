import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  collectRuleTally,
  countVerdictPrefixedLines,
  renderRuleTally,
  replaceGeneratedBlock,
} from "./rules-tally/tally";

/**
 * トレーサビリティの規約の集計が、実装規約と一致しているかを見るゲート。
 *
 * @remarks
 * 集計の中身は {@link collectRuleTally} が持ち、ここは実装規約とトレーサビリティ（とその
 * ミラー）を読んで突き合わせるだけを担う。
 *
 * 手で数えた件数を置かない決定に対を付けるのがこのゲートである
 * （[scripts](README.md#related-adrs)）。**陳腐化に人が気付く必要が無い**ことが狙いなので、
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
  const rules = readFileSync(resolve(ROOT, "docs/rules.md"), "utf8");
  const tally = collectRuleTally(rules);

  // ----- 正常系 -----
  it("数えられなかったものが無い", () => {
    expect(tally.violations).toEqual([]);
  });

  it("走査が縮退していない", () => {
    expect(tally.rules).toBeGreaterThanOrEqual(MINIMUM_RULES);
    expect(tally.sections).toBeGreaterThanOrEqual(MINIMUM_SECTIONS);
  });

  it("判定の前置きを持つ行の数だけ判定を読めており、1 件以上ある", () => {
    expect(tally.judged).toHaveLength(countVerdictPrefixedLines(rules));
    expect(tally.judged.length).toBeGreaterThanOrEqual(1);
  });

  it("トレーサビリティの生成ブロックが、いまの実装規約と一致する", () => {
    const traceability = readFileSync(resolve(ROOT, "docs/traceability.md"), "utf8");

    expect(traceability).toBe(replaceGeneratedBlock(traceability, renderRuleTally(tally, "en")));
  });

  it("トレーサビリティのミラーの生成ブロックが、いまの実装規約と一致する", () => {
    const mirror = readFileSync(resolve(ROOT, "docs/traceability.ja.md"), "utf8");

    expect(mirror).toBe(replaceGeneratedBlock(mirror, renderRuleTally(tally, "ja")));
  });
});
