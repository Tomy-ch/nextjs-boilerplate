import { describe, expect, it } from "vitest";

import { movesResult } from "./subject";

describe("movesResult", () => {
  // ----- 正常系 -----
  it("撮影と axe の対象そのものである story は動かしうる", () => {
    expect(movesResult("src/components/design-system/action/button/button.stories.tsx")).toBe(true);
  });

  it("検査の手順そのものである spec は動かしうる", () => {
    expect(movesResult("e2e/journeys/browse.spec.ts")).toBe(true);
  });

  it("描画とロジックは動かしうる", () => {
    expect(movesResult("src/features/settings/settings-view.tsx")).toBe(true);
  });

  // ----- 異常系 -----
  it("jsdom で完結する単体テストは動かさない", () => {
    expect(movesResult("src/features/settings/settings-view.test.tsx")).toBe(false);
    expect(movesResult("src/features/settings/total.test.ts")).toBe(false);
  });

  it("描かれない散文は動かさない", () => {
    expect(movesResult("src/features/settings/README.md")).toBe(false);
  });
});
