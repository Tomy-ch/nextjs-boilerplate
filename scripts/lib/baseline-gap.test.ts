import { describe, expect, it } from "vitest";

import { BASELINE_MISSING, BASELINE_ORPHAN } from "../../baseline/lib/orphans";
import { baselinelessTargets, orphanedBaselines } from "./baseline-gap";

const TAG = "@baselines";

/** 1 対 1 の検査 1 件ぶんのレポート。 */
function reportOf(annotations: { type: string; description: string }[], tag = "baselines"): string {
  return JSON.stringify({
    suites: [{ specs: [{ tags: [tag], tests: [{ status: "unexpected", annotations }] }] }],
  });
}

describe("orphanedBaselines", () => {
  // ----- 正常系 -----
  it("撮影対象を失った基準画像を、置き場からの相対パスで返す", () => {
    const json = reportOf([{ type: BASELINE_ORPHAN, description: "page/light/消えた--story.png" }]);

    expect(orphanedBaselines(json, TAG)).toEqual(["page/light/消えた--story.png"]);
  });

  it("欠けを表す注記は混ぜない", () => {
    const json = reportOf([{ type: BASELINE_MISSING, description: "page/light/a--b.png" }]);

    expect(orphanedBaselines(json, TAG)).toEqual([]);
  });

  // ----- 異常系 -----
  it("tag の違う spec の注記は拾わない", () => {
    const json = reportOf([{ type: BASELINE_ORPHAN, description: "page/light/別.png" }], "other");

    expect(orphanedBaselines(json, TAG)).toEqual([]);
  });
});

describe("baselinelessTargets", () => {
  // ----- 正常系 -----
  it("基準画像を持たない撮影対象を、撮り直しへ渡せる名前で返す", () => {
    const json = reportOf([
      { type: BASELINE_MISSING, description: "foundation/light/foundation-print--x.png" },
    ]);

    expect(baselinelessTargets(json, TAG)).toEqual(["foundation-print--x"]);
  });

  it("孤児を表す注記は混ぜない", () => {
    const json = reportOf([{ type: BASELINE_ORPHAN, description: "page/light/a--b.png" }]);

    expect(baselinelessTargets(json, TAG)).toEqual([]);
  });

  // ----- 異常系 -----
  it("tag の違う spec の注記は拾わない", () => {
    const json = reportOf([{ type: BASELINE_MISSING, description: "page/light/別.png" }], "other");

    expect(baselinelessTargets(json, TAG)).toEqual([]);
  });
});
