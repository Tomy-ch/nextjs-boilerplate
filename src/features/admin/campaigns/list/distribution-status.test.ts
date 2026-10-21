import { describe, expect, it } from "vitest";

import {
  DISTRIBUTION_STATUS,
  DISTRIBUTION_STATUS_NAME,
  toDistributionStatus,
} from "./distribution-status";

const STARTS_AT = "2026-03-01T00:00:00.000Z";
const ENDS_AT = "2026-03-31T15:00:00.000Z";
const SUSPENDED_AT = "2026-02-15T00:00:00.000Z";

const ONE_MS = 1;

function at(iso: string, offsetMs = 0): Date {
  return new Date(Date.parse(iso) + offsetMs);
}

function campaign(suspendedAt: string | null = null) {
  return { startsAt: STARTS_AT, endsAt: ENDS_AT, suspendedAt };
}

describe("DISTRIBUTION_STATUS_NAME", () => {
  // ----- 正常系 -----
  it("4 つの状態に、仕様の呼び名を対応させる", () => {
    expect(DISTRIBUTION_STATUS_NAME).toEqual({
      [DISTRIBUTION_STATUS.SUSPENDED]: "停止",
      [DISTRIBUTION_STATUS.UPCOMING]: "配布前",
      [DISTRIBUTION_STATUS.ACTIVE]: "配布中",
      [DISTRIBUTION_STATUS.ENDED]: "期間外",
    });
  });
});

describe("toDistributionStatus", () => {
  // ----- 正常系 -----
  it("開始の直前は、配布前とする", () => {
    expect(toDistributionStatus(campaign(), at(STARTS_AT, -ONE_MS))).toBe(
      DISTRIBUTION_STATUS.UPCOMING,
    );
  });

  it("開始の時刻ちょうどは、配布中とする", () => {
    expect(toDistributionStatus(campaign(), at(STARTS_AT))).toBe(DISTRIBUTION_STATUS.ACTIVE);
  });

  it("期間の途中は、配布中とする", () => {
    expect(toDistributionStatus(campaign(), at("2026-03-15T00:00:00.000Z"))).toBe(
      DISTRIBUTION_STATUS.ACTIVE,
    );
  });

  it("終了の直前は、配布中とする", () => {
    expect(toDistributionStatus(campaign(), at(ENDS_AT, -ONE_MS))).toBe(DISTRIBUTION_STATUS.ACTIVE);
  });

  it("終了の時刻ちょうどは、期間外とする", () => {
    expect(toDistributionStatus(campaign(), at(ENDS_AT))).toBe(DISTRIBUTION_STATUS.ENDED);
  });

  it("終了を過ぎたら、期間外とする", () => {
    expect(toDistributionStatus(campaign(), at("2026-04-15T00:00:00.000Z"))).toBe(
      DISTRIBUTION_STATUS.ENDED,
    );
  });

  it("停止した日時を持てば、期間の前でも停止とする", () => {
    expect(toDistributionStatus(campaign(SUSPENDED_AT), at(STARTS_AT, -ONE_MS))).toBe(
      DISTRIBUTION_STATUS.SUSPENDED,
    );
  });

  it("停止した日時を持てば、期間の中でも停止とする", () => {
    expect(toDistributionStatus(campaign(SUSPENDED_AT), at("2026-03-15T00:00:00.000Z"))).toBe(
      DISTRIBUTION_STATUS.SUSPENDED,
    );
  });

  it("停止した日時を持てば、期間の後でも停止とする", () => {
    expect(toDistributionStatus(campaign(SUSPENDED_AT), at("2026-04-15T00:00:00.000Z"))).toBe(
      DISTRIBUTION_STATUS.SUSPENDED,
    );
  });
});
