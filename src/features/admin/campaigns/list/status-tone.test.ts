import { describe, expect, it } from "vitest";

import { BADGE_VARIANT } from "@/components/design-system/display/badge/badge.definition";

import { DISTRIBUTION_STATUS } from "./distribution-status";
import { toDistributionStatusTone } from "./status-tone";

describe("toDistributionStatusTone", () => {
  // ----- 正常系 -----
  it("停止は明暗を反転させて最も強く出す", () => {
    expect(toDistributionStatusTone(DISTRIBUTION_STATUS.SUSPENDED)).toBe(BADGE_VARIANT.DEFAULT);
  });

  it("配布前は注意として出す", () => {
    expect(toDistributionStatusTone(DISTRIBUTION_STATUS.UPCOMING)).toBe(BADGE_VARIANT.WARNING);
  });

  it("配布中は塗りで出す", () => {
    expect(toDistributionStatusTone(DISTRIBUTION_STATUS.ACTIVE)).toBe(BADGE_VARIANT.SECONDARY);
  });

  it("期間外は枠線だけで出す", () => {
    expect(toDistributionStatusTone(DISTRIBUTION_STATUS.ENDED)).toBe(BADGE_VARIANT.OUTLINE);
  });

  it("4 つの状態が、互いに別の見た目になる", () => {
    const tones = Object.values(DISTRIBUTION_STATUS).map(toDistributionStatusTone);

    expect(new Set(tones).size).toBe(tones.length);
  });
});
