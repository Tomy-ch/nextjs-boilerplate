import { describe, expect, it } from "vitest";

import {
  LIVE_BRANCH_PATTERNS,
  PRUNE_THRESHOLDS,
  RETAINED_TAG_COUNT,
  ROOT_BRANCH,
  SNAPSHOT_REF_PREFIX,
} from "./retention";

describe("LIVE_BRANCH_PATTERNS", () => {
  // ----- 正常系 -----
  it("ADR 0150 の常設ブランチを漏れなく持つ", () => {
    expect(LIVE_BRANCH_PATTERNS).toEqual(
      expect.arrayContaining(["production", "staging", "develop"]),
    );
  });

  // ----- 異常系 -----
  it("撮影の ref 側と接頭辞が衝突しない", () => {
    const conflicting = LIVE_BRANCH_PATTERNS.filter((pattern) =>
      pattern.startsWith(SNAPSHOT_REF_PREFIX),
    );

    expect(conflicting).toEqual([]);
  });

  it("既定ブランチを保持対象として二重に数えない", () => {
    expect(LIVE_BRANCH_PATTERNS).not.toContain(ROOT_BRANCH);
  });
});

describe("PRUNE_THRESHOLDS", () => {
  // ----- 正常系 -----
  it("GitHub が推奨する 1 GiB より手前で鳴る", () => {
    expect(PRUNE_THRESHOLDS.repositoryMiB).toBeLessThan(1024);
  });

  // ----- 異常系 -----
  it("0 で鳴らない（毎月鳴る報告は読まれない）", () => {
    expect(PRUNE_THRESHOLDS.removableRefs).toBeGreaterThan(0);
    expect(PRUNE_THRESHOLDS.repositoryMiB).toBeGreaterThan(0);
  });
});

describe("RETAINED_TAG_COUNT", () => {
  // ----- 正常系 -----
  it("直近のタグを 1 本以上残す", () => {
    expect(RETAINED_TAG_COUNT).toBeGreaterThan(0);
  });
});
