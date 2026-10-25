import { describe, expect, it } from "vitest";

import {
  CAMPAIGN_CODE_MAX_LENGTH,
  CAMPAIGN_CODE_MIN_LENGTH,
  CAMPAIGN_CODE_PATTERN,
  CAMPAIGN_LIMIT_MIN,
} from "./campaign-limits";

describe("CAMPAIGN_CODE_MIN_LENGTH", () => {
  // ----- 正常系 -----
  it("最長より短い", () => {
    expect(CAMPAIGN_CODE_MIN_LENGTH).toBeLessThan(CAMPAIGN_CODE_MAX_LENGTH);
  });
});

describe("CAMPAIGN_CODE_MAX_LENGTH", () => {
  // ----- 正常系 -----
  it("最短より長い", () => {
    expect(CAMPAIGN_CODE_MAX_LENGTH).toBeGreaterThan(CAMPAIGN_CODE_MIN_LENGTH);
  });
});

describe("CAMPAIGN_CODE_PATTERN", () => {
  // ----- 正常系 -----
  it("英数字とハイフンだけの綴りに一致する", () => {
    expect(CAMPAIGN_CODE_PATTERN.test("WELCOME-2026")).toBe(true);
    expect(CAMPAIGN_CODE_PATTERN.test("welcome-2026")).toBe(true);
  });

  // ----- 異常系 -----
  it("空白・記号・英数字以外の文字を含む綴りには一致しない", () => {
    expect(CAMPAIGN_CODE_PATTERN.test("WELCOME 2026")).toBe(false);
    expect(CAMPAIGN_CODE_PATTERN.test("WELCOME_2026")).toBe(false);
    expect(CAMPAIGN_CODE_PATTERN.test("ようこそ2026")).toBe(false);
    expect(CAMPAIGN_CODE_PATTERN.test("")).toBe(false);
  });
});

describe("CAMPAIGN_LIMIT_MIN", () => {
  // ----- 正常系 -----
  it("1 枚である", () => {
    expect(CAMPAIGN_LIMIT_MIN).toBe(1);
  });
});
