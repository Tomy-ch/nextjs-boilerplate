import { describe, expect, it } from "vitest";

import { BASELINE_MISSING, BASELINE_ORPHAN } from "./orphans";
import { noteBaselineGap } from "./report-gap";

const PRESENT = ["page/light/a--x.png", "page/light/消えた--story.png"];
const EXPECTED = ["page/light/a--x.png", "page/light/まだ無い--story.png"];

describe("noteBaselineGap", () => {
  // ----- 正常系 -----
  it("撮影対象を失った基準画像と、基準画像を持たない撮影対象を分けて返す", () => {
    const gap = noteBaselineGap([], PRESENT, EXPECTED);

    expect(gap).toEqual({
      orphans: ["page/light/消えた--story.png"],
      missing: ["page/light/まだ無い--story.png"],
    });
  });

  it("見つけた一覧を、型で区別できる注記として載せる", () => {
    const annotations: { type: string; description?: string }[] = [];

    noteBaselineGap(annotations, PRESENT, EXPECTED);

    expect(annotations).toEqual([
      { type: BASELINE_ORPHAN, description: "page/light/消えた--story.png" },
      { type: BASELINE_MISSING, description: "page/light/まだ無い--story.png" },
    ]);
  });

  it("既に載っている注記を消さない", () => {
    const annotations = [{ type: "story", description: "a--x" }];

    noteBaselineGap(annotations, PRESENT, EXPECTED);

    expect(annotations[0]).toEqual({ type: "story", description: "a--x" });
  });

  // ----- 異常系 -----
  it("ずれが無ければ、注記を 1 つも載せない", () => {
    const annotations: { type: string; description?: string }[] = [];

    noteBaselineGap(annotations, PRESENT, PRESENT);

    expect(annotations).toEqual([]);
  });
});
